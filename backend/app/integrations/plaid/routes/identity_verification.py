from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Literal
import json
import os

from app.core.auth.session_manager import get_current_user
from app.db import models as db_models
from app.db.database import SessionLocal
from .shared import plaid_client

TEMPLATE_ID = os.getenv("PLAID_IDV_TEMPLATE_ID")

try:
    from plaid.model.identity_verification_create_request import IdentityVerificationCreateRequest
    from plaid.model.identity_verification_get_request import IdentityVerificationGetRequest
except Exception:  # pragma: no cover
    IdentityVerificationCreateRequest = None  # type: ignore
    IdentityVerificationGetRequest = None  # type: ignore

router = APIRouter()


class CreateIDVSessionResponse(BaseModel):
    session_id: str
    status: Optional[str] = None  # estado crudo Plaid
    status_mapped: Optional[Literal["PENDING", "REVIEW", "APPROVED", "FAILED", "CANCELED", "UNKNOWN"]] = None
    url: Optional[str] = None
    approved_at: Optional[str] = None
    failed_reason: Optional[str] = None


class IDVSessionResponse(BaseModel):
    session: dict  # payload enriquecido (incluye status_mapped si se añadió)


def _to_dict(obj):
    try:
        if hasattr(obj, "to_dict"):
            return obj.to_dict()  # type: ignore[attr-defined]
    except Exception:
        pass
    if isinstance(obj, dict):
        return obj
    return {}


def _map_status(raw: Optional[str]) -> str:
    if not raw:
        return "UNKNOWN"
    r = raw.lower()
    if r in {"created", "in_progress", "active", "pending"}:
        return "PENDING"
    if r in {"needs_review", "review", "manual_review"}:
        return "REVIEW"
    if r in {"approved", "completed", "success", "succeeded"}:
        return "APPROVED"
    if r in {"failed", "error", "declined"}:
        return "FAILED"
    if r in {"canceled", "cancelled", "abandoned"}:
        return "CANCELED"
    return "UNKNOWN"


def _persist_session(db, user_id: int, session_id: str, status: str, payload: dict, template_id: Optional[str]):
    from app.db.models import PlaidIdentityVerification  # local import to avoid circular
    row = (
        db.query(PlaidIdentityVerification)
        .filter(PlaidIdentityVerification.plaid_session_id == session_id)
        .first()
    )
    payload_str = None
    try:
        payload_str = json.dumps(payload)[:3900]
    except Exception:
        pass
    if row:
        row.status = status
        row.last_payload = payload_str
    else:
        row = PlaidIdentityVerification(
            user_id=user_id,
            plaid_session_id=session_id,
            status=status,
            last_payload=payload_str,
            template_id=template_id,
        )
        db.add(row)
    db.commit()
    return row


@router.post("/identity_verification/session", response_model=CreateIDVSessionResponse)
def create_identity_verification_session(
    force: bool = Query(False, description="Forzar creación aunque exista sesión IDV activa/pending"),
    user: db_models.User = Depends(get_current_user),
):
    if IdentityVerificationCreateRequest is None:
        raise HTTPException(status_code=500, detail="SDK Plaid sin soporte Identity Verification")
    client = plaid_client()
    try:
        # Verificar si ya existe sesión 'activa/pending' para evitar spam / duplicados rápidos
        from app.db.models import PlaidIdentityVerification  # local import para no romper imports arriba
        with SessionLocal() as db:
            existing = (
                db.query(PlaidIdentityVerification)
                .filter(PlaidIdentityVerification.user_id == user.id)
                .order_by(PlaidIdentityVerification.id.desc())
                .first()
            )
            if existing:
                mapped = _map_status(existing.status)
                if not force and mapped in {"PENDING", "REVIEW"}:
                    # Evitar crear otra sesión hasta que se resuelva o se fuerce.
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "error": "session_in_progress",
                            "session_id": existing.plaid_session_id,
                            "status": existing.status,
                            "status_mapped": mapped,
                            "message": "Ya existe una sesión IDV activa. Usa force=true para generar otra (esto invalidará el flujo anterior en Plaid).",
                        },
                    )
        # El SDK y el producto requieren template_id (no todos los entornos permiten omitirlo).
        if not TEMPLATE_ID:
            raise HTTPException(
                status_code=400,
                detail=(
                    "PLAID_IDV_TEMPLATE_ID no configurado. Crea una plantilla en el Dashboard de Plaid: "
                    "Dashboard > Identity Verification > Templates > New Template. Luego coloca el ID (ej: tpl_abc123) en .env como PLAID_IDV_TEMPLATE_ID y reinicia."
                ),
            )

        # Manejo de cambio de tipo de client_user_id (algunas versiones esperan instancia DeprecatedClientUserID)
        deprecated_client_user_id_cls = None
        try:  # pragma: no cover (import defensivo)
            from plaid.model.deprecated_client_user_id import DeprecatedClientUserID  # type: ignore
            deprecated_client_user_id_cls = DeprecatedClientUserID
        except Exception:
            deprecated_client_user_id_cls = None

        client_user_id_value: object = str(user.id)
        if deprecated_client_user_id_cls is not None:
            try:
                client_user_id_value = deprecated_client_user_id_cls(str(user.id))  # type: ignore
            except Exception:
                # fallback silencioso a string si falla el wrapper
                client_user_id_value = str(user.id)

        create_kwargs = {
            "template_id": str(TEMPLATE_ID),
            "user": {
                "client_user_id": client_user_id_value,
                "email_address": user.email,
            },
            "is_shareable": True,
        }
        try:
            req = IdentityVerificationCreateRequest(**create_kwargs)  # type: ignore[arg-type]
        except TypeError as te:
            # Fallbacks dinámicos según versión del SDK (quitar is_shareable o template_id si causa error)
            alt_kwargs = dict(create_kwargs)
            if 'is_shareable' in str(te):
                alt_kwargs.pop('is_shareable', None)
            try:
                req = IdentityVerificationCreateRequest(**alt_kwargs)  # type: ignore[arg-type]
            except TypeError as te2:
                if 'template_id' in str(te2) and 'template_id' in alt_kwargs:
                    alt_kwargs.pop('template_id', None)
                    req = IdentityVerificationCreateRequest(**alt_kwargs)  # type: ignore[arg-type]
                else:
                    raise
        resp = client.identity_verification_create(req)
        data = _to_dict(resp) or {}
        session_id = data.get("id") or data.get("session_id")
        if not session_id:
            raise RuntimeError("Respuesta sin id de sesión IDV")
        status = data.get("status")
        url = data.get("url")
        user_id_int = int(getattr(user, "id"))  # ensure plain int for type checkers
        with SessionLocal() as db:
            _persist_session(db, user_id_int, session_id, status or "created", data, TEMPLATE_ID)
        # Recuperar fila persistida para enriquecer la respuesta (approved_at / failed_reason si aplica)
        mapped = _map_status(status)
        with SessionLocal() as db2:
            row = (
                db2.query(PlaidIdentityVerification)
                .filter(PlaidIdentityVerification.plaid_session_id == session_id)
                .first()
            )
            approved_at_s = None
            failed_reason_s = None
            if row is not None:
                if getattr(row, "approved_at", None):
                    try:
                        approved_at_s = row.approved_at.isoformat()  # type: ignore[attr-defined]
                    except Exception:
                        approved_at_s = None
                failed_reason_s = getattr(row, "failed_reason", None)
        return CreateIDVSessionResponse(
            session_id=session_id,
            status=status,
            status_mapped=mapped,
            url=url,
            approved_at=approved_at_s,
            failed_reason=failed_reason_s,
        )
    except Exception as e:  # pragma: no cover
        # Si es ApiException de Plaid, inspeccionamos el cuerpo para INVALID_PRODUCT
        msg = str(e)
        try:
            from plaid.exceptions import ApiException  # type: ignore
        except Exception:
            ApiException = None  # type: ignore
        if ApiException and isinstance(e, ApiException):  # type: ignore[arg-type]
            body_txt = getattr(e, "body", None)
            parsed = {}
            if body_txt:
                try:
                    parsed = json.loads(body_txt)
                except Exception:
                    parsed = {}
            error_code = parsed.get("error_code") if isinstance(parsed, dict) else None
            if error_code == "INVALID_PRODUCT":
                raise HTTPException(
                    status_code=501,
                    detail=(
                        "Plaid: producto identity_verification no habilitado para tu client_id. "
                        "Acciones: 1) Elimina 'identity_verification' de PLAID_PRODUCTS para ocultar la función temporalmente; "
                        "2) Solicita acceso en el Dashboard / contacto con soporte Plaid indicando caso de uso (KYC); "
                        "3) Una vez aprobado, añade de nuevo el producto y reinicia backend."
                    ),
                )
        if "client_user_id" in msg and "DeprecatedClientUserID" in msg:
            msg += " — Intenta actualizar plaid-python o confirma el modelo requerido para client_user_id."
        raise HTTPException(status_code=400, detail=f"Error creando sesión IDV: {msg}")


@router.get("/identity_verification/session/{session_id}", response_model=IDVSessionResponse)
def get_identity_verification_session(session_id: str, user: db_models.User = Depends(get_current_user)):
    if IdentityVerificationGetRequest is None:
        raise HTTPException(status_code=500, detail="SDK Plaid sin soporte Identity Verification")
    client = plaid_client()
    try:
        req = IdentityVerificationGetRequest(identity_verification_id=session_id)
        resp = client.identity_verification_get(req)
        data = _to_dict(resp) or {}
        status = data.get("status")
        user_id_int = int(getattr(user, "id"))
        with SessionLocal() as db:
            _persist_session(db, user_id_int, session_id, status or "unknown", data, TEMPLATE_ID)
        # Enriquecer payload con status_mapped y campos DB (approved_at / failed_reason)
        from app.db.models import PlaidIdentityVerification
        with SessionLocal() as db2:
            row = (
                db2.query(PlaidIdentityVerification)
                .filter(PlaidIdentityVerification.plaid_session_id == session_id)
                .first()
            )
            if row:
                mapped = _map_status(row.status)
                try:
                    if row.approved_at and "approved_at" not in data:
                        data["approved_at"] = row.approved_at.isoformat()
                except Exception:
                    pass
                if row.failed_reason and "failed_reason" not in data:
                    data["failed_reason"] = row.failed_reason
                data["status_mapped"] = mapped
        return IDVSessionResponse(session=data)
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"Error obteniendo sesión IDV: {e}")


@router.get("/identity_verification/latest", response_model=Optional[IDVSessionResponse])
def get_latest_identity_verification(user: db_models.User = Depends(get_current_user)):
    from app.db.models import PlaidIdentityVerification
    user_id_int = int(getattr(user, "id"))
    with SessionLocal() as db:
        row = (
            db.query(PlaidIdentityVerification)
            .filter(PlaidIdentityVerification.user_id == user_id_int)
            .order_by(PlaidIdentityVerification.id.desc())
            .first()
        )
        if not row:
            return None
        parsed: dict = {}
        raw_payload = row.last_payload if isinstance(row.last_payload, str) else None
        if isinstance(raw_payload, str) and raw_payload.strip():
            try:
                parsed = json.loads(raw_payload)
            except Exception:
                parsed = {}
        mapped = _map_status(row.status)
        payload = {
            "id": row.plaid_session_id,
            "status": row.status,
            "status_mapped": mapped,
            "template_id": row.template_id,
            **parsed,
        }
        if getattr(row, "approved_at", None) and "approved_at" not in payload:
            try:
                payload["approved_at"] = row.approved_at.isoformat()  # type: ignore[attr-defined]
            except Exception:
                pass
        if getattr(row, "failed_reason", None) and "failed_reason" not in payload:
            payload["failed_reason"] = row.failed_reason
        return IDVSessionResponse(session=payload)


@router.get("/identity_verification/availability")
def idv_availability():
    """Devuelve si identity_verification está habilitado (producto en env y template presente).

    Nota: No garantiza que Plaid ya haya habilitado el producto comercialmente; sólo valida configuración local.
    Si el producto no está en PLAID_PRODUCTS o falta template se marca disabled con reason.
    """
    from app.config.settings import PLAID_PRODUCTS
    products_lower = [p.lower() for p in PLAID_PRODUCTS]
    if "identity_verification" not in products_lower:
        return {"enabled": False, "reason": "identity_verification no listado en PLAID_PRODUCTS"}
    if not TEMPLATE_ID:
        return {"enabled": False, "reason": "PLAID_IDV_TEMPLATE_ID ausente"}
    return {"enabled": True}
