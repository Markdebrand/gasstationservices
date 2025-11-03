from __future__ import annotations

from typing import Any, cast
from typing import Any, Optional
import logging
from fastapi import APIRouter, Depends, Response, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from starlette.concurrency import run_in_threadpool

from app.db.database import get_db
from app.core.auth.session_manager import get_current_user
from app.db import models as m
from app.core.permissions_policies import require_due_create
from app.db.queries.due_queries import (
    list_reports_by_owner,
    list_reports_all,
    get_report_for_owner,
    create_report as dal_create_report,
    get_report_by_id as dal_get_report_by_id,
    delete_report as dal_delete_report,
)
from app.core.services.usage_service import (
    check_quota,
    consume,
    refund,
    get_active_subscription,
    get_usage_status,
)
from .dd_service import run_due_diligence, run_due_diligence_async
from app.utils.metrics import increment

logger = logging.getLogger("app.integrations.due")


from app.core.auth.guards import disallow_roles

router = APIRouter(prefix="/due", tags=["Due Diligence"], dependencies=[Depends(disallow_roles("cliente"))])


class DueRequest(BaseModel):
    description: str
    contact_name: str | None = None
    # payload libre adicional
    extra: dict[str, Any] | None = None


class DueResponse(BaseModel):
    ok: bool
    remaining: int | None = None
    limit: int | None = None
    job_id: str | None = None
    data: Any | None = None


# --- Usage/quota helpers ---
class UsageInfo(BaseModel):
    feature: str
    used: int | None
    limit: int | None
    remaining: int | None


@router.get("/usage", response_model=UsageInfo)
def usage(response: Response, db: Session = Depends(get_db), user: m.User = Depends(get_current_user)):
    sub = get_active_subscription(db, user.id) # type: ignore
    status = get_usage_status(db, sub.id, "due_diligence")  # type: ignore[arg-type]
    # Disable caching to avoid stale 304s
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return {"feature": "due_diligence", **status}


@router.get("/quota")
def due_quota(db: Session = Depends(get_db), user: m.User = Depends(get_current_user)):
    sub = get_active_subscription(db, user.id) # type: ignore
    status = get_usage_status(db, sub.id, "due_diligence")  # type: ignore[arg-type]
    return {"ok": True, **status}


# --- Listado y detalle de reportes ---
class DueReportOut(BaseModel):
    id: int
    title: str
    status: str
    created_at: str
    completed_at: str | None = None


class DueReportDetailOut(DueReportOut):
    content: Any | None = None


@router.get("/reports", response_model=list[DueReportOut])
def list_reports(
    response: Response,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: m.User = Depends(get_current_user),
):
    limit = max(1, min(200, int(limit)))
    offset = max(0, int(offset))
    rows = list_reports_by_owner(db, owner_id=user.id, limit=limit, offset=offset)  # type: ignore[arg-type]
    out: list[DueReportOut] = []
    for r in rows:
        rid = getattr(r, "id", None)
        rtitle = getattr(r, "title", "")
        rstatus = getattr(r, "status", "")
        rcreated = getattr(r, "created_at", None)
        rcompleted = getattr(r, "completed_at", None)
        out.append(
            DueReportOut(
                id=int(rid if rid is not None else 0),
                title=str(rtitle),
                status=str(rstatus),
                created_at=(rcreated.isoformat() if rcreated else ""),
                completed_at=(rcompleted.isoformat() if rcompleted else None),
            )
        )
    # Disable caching
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return out


@router.get("/report/{report_id}", response_model=DueReportDetailOut)
def report_detail(
    response: Response,
    report_id: int,
    db: Session = Depends(get_db),
    user: m.User = Depends(get_current_user),
):
    r = get_report_for_owner(db, report_id=report_id, owner_id=user.id)  # type: ignore[arg-type]
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    rid = getattr(r, "id", None)
    rtitle = getattr(r, "title", "")
    rstatus = getattr(r, "status", "")
    rcreated = getattr(r, "created_at", None)
    rcompleted = getattr(r, "completed_at", None)
    rcontent = getattr(r, "content", None)
    # Disable caching
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return DueReportDetailOut(
        id=int(rid if rid is not None else 0),
        title=str(rtitle),
        status=str(rstatus),
        created_at=(rcreated.isoformat() if rcreated else ""),
        completed_at=(rcompleted.isoformat() if rcompleted else None),
        content=rcontent,
    )


@router.post("/create", response_model=DueResponse)
async def create_due(
    req: DueRequest,
    db: Session = Depends(get_db),
    user: m.User = Depends(get_current_user),
):
    # 1) permiso
    require_due_create(user, db)

    # 2) cupo (admin/superadmin no consume)
    sub = get_active_subscription(db, user.id) # type: ignore
    is_free = getattr(user, "is_superadmin", False) or getattr(user, "role", None) == "admin"
    if is_free:
        quota = {"remaining": None, "limit": None}
    else:
        # Solo validar que hay cupo; el consumo será después si la operación es exitosa
        quota = check_quota(db, sub.id, "due_diligence", units=1)  # type: ignore[arg-type]

    # 3) Persistir registro (opcional) como rastro en DB
    title = (req.contact_name or "Due Diligence").strip() or "Due Diligence"
    increment("due.create.request", tags={"free": is_free})
    try:
        logger.info(
            "Due create request",
            extra={"user_id": getattr(user, "id", None), "title": title, "free": is_free},
        )
    except Exception:
        pass
    try:
        report = await run_in_threadpool(
            dal_create_report,
            db,
            user.id,
            user.id,
            title,
            m.ReportStatus.running.value,
        )  # type: ignore[arg-type]
    except Exception as e:
        # Si la tabla no existe o hay error de esquema, evitar 502 genérico
        from fastapi import HTTPException
        db.rollback()
        try:
            logger.exception(
                "Due report persist failed",
                extra={"user_id": getattr(user, "id", None), "title": title},
            )
            increment("due.create.db_error")
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Error persistiendo reporte inicial: {e}")

    # 4) Ejecutar lógica (p.ej., n8n / Odoo) y almacenar resultado
    # Include language hints for downstream (n8n) to favor English generation
    result = await run_due_diligence_async(payload={
        "description": req.description,
        "contact_name": req.contact_name,
        "language": "en",
        "locale": "en_US",
        **(req.extra or {}),
    })
    # Determinar si hubo éxito
    success = True
    try:
        if isinstance(result, dict):
            # Consideramos error si hay clave 'error' o código/flag obvio
            if result.get("error") or result.get("status") in {"error", "failed", "ko"}:
                success = False
        elif isinstance(result, str):
            # Heurística: si contiene 'error' en texto
            if "error" in result.lower():
                success = False
    except Exception:
        success = False
    try:
        if success:
            increment("due.create.success")
        else:
            increment("due.create.failure")
    except Exception:
        pass

    # 5) Consumir si éxito y no es admin/superadmin; actualizar estado del reporte
    try:
        if success:
            if not is_free:
                quota = await run_in_threadpool(consume, db, sub.id, "due_diligence", 1)  # type: ignore[arg-type]
            report.status = m.ReportStatus.ready.value  # type: ignore[assignment]
        else:
            report.status = m.ReportStatus.error.value  # type: ignore[assignment]
        report.content = result  # type: ignore[assignment]
        db.add(report)
        await run_in_threadpool(db.commit)
        await run_in_threadpool(db.refresh, report)
    except Exception as e:
        db.rollback()
        try:
            logger.exception(
                "Due finalize persist failed",
                extra={"report_id": getattr(report, "id", None)},
            )
            increment("due.create.finalize_error")
        except Exception:
            pass

    return {
        "ok": success,
        "remaining": quota["remaining"],
        "limit": quota["limit"],
        "job_id": None,
        "data": result,
    }


class ReportListItem(BaseModel):
    id: int
    title: str
    status: str
    created_at: Any | None = None


@router.get("/list", response_model=list[ReportListItem])
def list_due_reports(
    db: Session = Depends(get_db),
    user: m.User = Depends(get_current_user),
):
    # Admin/superadmin pueden ver todos; usuarios solo los propios
    is_admin = getattr(user, "is_superadmin", False) or getattr(user, "role", None) == "admin"
    if is_admin:
        rows = list_reports_all(db)
    else:
        rows = list_reports_by_owner(db, owner_id=user.id)  # type: ignore[arg-type]
    out: list[ReportListItem] = []
    for r in rows:
        out.append(ReportListItem(
            id=int(getattr(r, "id")),
            title=str(getattr(r, "title")),
            status=str(getattr(r, "status")),
            created_at=getattr(r, "created_at", None),
        ))
    return out


@router.delete("/{report_id}")
def delete_due(
    report_id: int,
    db: Session = Depends(get_db),
    user: m.User = Depends(get_current_user),
):
    """Elimina un Due Diligence propio y libera 1 cupo si corresponde.

    Reglas de refund:
    - Solo el dueño (owner_id) o superadmin/admin pueden eliminar.
    - Reembolsa 1 unidad solo si:
      a) el reporte está en estado "ready" (éxito previo), y
      b) fue consumido en el periodo mensual actual (UTC) y
      c) el usuario no es admin/superadmin (ellos no consumen).
    - Si el plan no tiene límite (None), no es necesario reembolsar (no-op).
    """
    report = dal_get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    is_admin = getattr(user, "is_superadmin", False) or getattr(user, "role", None) == "admin"
    owner_id: int = cast(int, getattr(report, "owner_id"))
    user_id: int = cast(int, getattr(user, "id"))
    not_authorized = (not is_admin) and (owner_id != user_id)
    if not_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    # Ubicar suscripción activa del dueño (si no tiene, igual permitimos borrar; solo no habrá refund)
    try:
        sub = get_active_subscription(db, report.owner_id)  # type: ignore[arg-type]
    except HTTPException:
        sub = None  # type: ignore[assignment]

    # Determinar si entra en periodo actual: usamos created_at para el mes de consumo
    from app.core.services.usage_service import _period_month_bounds
    now = datetime.now(timezone.utc)
    start, end = _period_month_bounds(now)
    in_current_period = False
    try:
        created_at = getattr(report, "created_at", None)
        if created_at is not None:
            created_at = created_at.astimezone(timezone.utc)
            in_current_period = (created_at >= start) and (created_at < end)
    except Exception:
        in_current_period = False

    # Borrar
    try:
        dal_delete_report(db, report)
    except Exception as e:
        db.rollback()
        try:
            logger.exception(
                "Due delete failed",
                extra={"report_id": report_id, "user_id": getattr(user, "id", None)},
            )
            increment("due.delete.error")
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Error eliminando reporte: {e}")

    # Refund si aplica
    refunded = None
    if (
        (not is_admin)
        and sub is not None
        and (getattr(report, "status", None) == m.ReportStatus.ready.value)
        and in_current_period
    ):
        try:
            refunded = refund(db, sub.id, "due_diligence", units=1)  # type: ignore[arg-type]
            try:
                increment("due.refund.success")
            except Exception:
                pass
        except Exception as e:
            refunded = None
            try:
                logger.warning(
                    "Due refund failed",
                    extra={"report_id": report_id, "user_id": getattr(user, "id", None), "error": str(e)},
                )
                increment("due.refund.error")
            except Exception:
                pass

    return {"ok": True, "refunded": refunded}
