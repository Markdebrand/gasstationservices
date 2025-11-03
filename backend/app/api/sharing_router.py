
from __future__ import annotations
import secrets
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from app.core.auth.session_manager import get_current_user
from app.db.database import SessionLocal
from app.db.models import User, SharingInvitation, SharingSnapshot, PlaidItem
from app.config.settings import PLAID_PRODUCTS
from app.services.sharing_email_service import (
    send_invitation_email,
    send_consent_granted_email,
    send_revoked_email,
    send_identity_shared_email,
)
from app.integrations.plaid.plaid_storage import latest_access_token
from app.integrations.plaid.routes.shared import plaid_client
from app.core.auth.guards import require_admin

router = APIRouter(prefix="/sharing", tags=["sharing"])

@router.delete("/invitations/all")
async def delete_all_invitations(user: User = Depends(get_current_user)):
    """Elimina todas las invitaciones creadas por el usuario autenticado."""
    with SessionLocal() as db:
        deleted = db.query(SharingInvitation).filter(SharingInvitation.inviter_user_id == user.id).delete()
        db.commit()
        logger.info("sharing.invitation.deleted_all", extra={"user_id": getattr(user,'id',None), "count": deleted})
        return {"deleted": deleted}

DEFAULT_EXPIRY_DAYS = 7


class ScopeModel(BaseModel):
    balance: bool = True
    identity: bool = False
    transactions: bool = False
    investments: bool = False


class CreateInvitationBody(BaseModel):
    email: EmailStr
    scopes: ScopeModel


class InvitationCreatedResponse(BaseModel):
    id: int
    token: str
    status: str
    expires_at: Optional[str]


class InvitationPublicView(BaseModel):
    inviter_name: Optional[str]
    inviter_email: EmailStr
    requested_scopes: Dict[str, bool]
    status: str
    expires_at: Optional[str]


class ConsentBody(BaseModel):
    accept: bool
    # the client can send a subset (must be <= requested)
    scopes: Optional[ScopeModel] = None


class InvitationListItem(BaseModel):
    id: int
    invitee_email: EmailStr
    status: str
    created_at: str
    consented_at: Optional[str]


class RevokeBody(BaseModel):
    reason: Optional[str] = None


class SnapshotView(BaseModel):
    data_type: str
    payload: dict
    fetched_at: str


def _now_utc():
    return datetime.now(timezone.utc)


def _as_aware_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure a datetime is timezone-aware in UTC.

    If dt is naive, assume it's stored as UTC in DB and attach UTC tzinfo.
    If dt is aware, convert to UTC.
    """
    if dt is None:
        return None
    try:
        if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:  # type: ignore[union-attr]
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        # Fallback: treat as UTC
        return dt.replace(tzinfo=timezone.utc)


def _serialize_scopes(scope: ScopeModel) -> str:
    return json.dumps(scope.dict())


def _parse_scopes(raw: Optional[str]) -> Dict[str, bool]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return {k: bool(v) for k, v in data.items()}
    except Exception:
        return {}
    return {}


_INVITE_RL_WINDOW_SEC = 3600
_INVITE_RL_MAX = 100
logger = logging.getLogger("app.sharing")


@router.post("/invitations", response_model=InvitationCreatedResponse)
async def create_invitation(body: CreateInvitationBody, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    logger.info("sharing.invitation.create.request", extra={"inviter_id": getattr(user, 'id', None), "email": body.email})
    from app.auth.security_jwt import create_access_token
    # El subject será el email del invitado, el sid el id del cliente, el rol 'cliente'
    token = create_access_token(
        subject=body.email.lower(),
        sid=str(user.id),
        role="cliente"
    )
    expires_at = _now_utc() + timedelta(days=DEFAULT_EXPIRY_DAYS)
    with SessionLocal() as db:
        # Rate limiting naive basado en conteo en ventana
        try:
            cutoff = _now_utc() - timedelta(seconds=_INVITE_RL_WINDOW_SEC)
            recent = (
                db.query(SharingInvitation)
                .filter(SharingInvitation.inviter_user_id == user.id, SharingInvitation.created_at >= cutoff)
                .count()
            )
            if recent >= _INVITE_RL_MAX:
                raise HTTPException(status_code=429, detail="Límite de invitaciones alcanzado. Intenta más tarde.")
        except HTTPException:
            raise
        except Exception:
            logger.warning("Rate limit sharing invitaciones: fallo conteo", exc_info=True)
        inv = SharingInvitation(
            inviter_user_id=user.id,
            invitee_email=body.email.lower(),
            token=token,
            requested_scopes=_serialize_scopes(body.scopes),
            status="PENDING",
            expires_at=expires_at,
        )
        db.add(inv)
        db.commit()
        db.refresh(inv)
        logger.info("sharing.invitation.created", extra={"invitation_id": getattr(inv,'id',None), "inviter_id": getattr(user,'id',None)})
        # Enviar email (background)
        try:
            scopes_dict = _parse_scopes(getattr(inv, "requested_scopes", None))
            background_tasks.add_task(send_invitation_email, str(user.email), body.email.lower(), token, scopes_dict)  # type: ignore[arg-type]
            logger.info("sharing.invitation.email.scheduled", extra={"invitation_id": getattr(inv,'id',None), "invitee": body.email.lower()})
        except Exception:
            logger.warning("sharing.invitation.email.schedule_failed", exc_info=True)
        inv_id = int(getattr(inv, "id"))
        inv_status = str(getattr(inv, "status"))
        inv_expires_at = getattr(inv, "expires_at", None)
        return InvitationCreatedResponse(
            id=inv_id,
            token=token,
            status=inv_status,
            expires_at=inv_expires_at.isoformat() if inv_expires_at else None,
        )


@router.get("/invitations/token/{token}", response_model=InvitationPublicView)
def get_invitation_public(token: str):
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.token == token).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        inv_expires_at = _as_aware_utc(getattr(inv, "expires_at", None))
        inv_status = str(getattr(inv, "status"))
        if inv_expires_at is not None and inv_expires_at < _now_utc():
            if inv_status not in {"EXPIRED", "REVOKED", "REJECTED"}:
                setattr(inv, "status", "EXPIRED")
                db.commit()
            raise HTTPException(status_code=410, detail="Invitación expirada")
        inviter = inv.inviter
        inv_status = str(getattr(inv, "status"))
        inv_expires_at = _as_aware_utc(getattr(inv, "expires_at", None))
        return InvitationPublicView(
            inviter_name=(f"{inviter.first_name} {inviter.last_name}".strip() if inviter else None),
            inviter_email=inviter.email if inviter else "",
            requested_scopes=_parse_scopes(getattr(inv, "requested_scopes", None)),
            status=inv_status,
            expires_at=inv_expires_at.isoformat() if inv_expires_at else None,
        )


@router.post("/invitations/token/{token}/consent", response_model=InvitationCreatedResponse)
async def give_consent(token: str, body: ConsentBody, background_tasks: BackgroundTasks, user: User = Depends(get_current_user)):
    logger.info("sharing.consent.request", extra={"user_id": getattr(user,'id',None), "token": token})
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.token == token).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        inv_expires_at = _as_aware_utc(getattr(inv, "expires_at", None))
        inv_status = str(getattr(inv, "status"))
        if inv_expires_at is not None and inv_expires_at < _now_utc():
            if inv_status not in {"EXPIRED", "REVOKED", "REJECTED"}:
                setattr(inv, "status", "EXPIRED")
                db.commit()
            raise HTTPException(status_code=410, detail="Invitación expirada")
        if inv_status in {"REVOKED", "EXPIRED", "REJECTED"}:
            raise HTTPException(status_code=400, detail="Invitación inactiva")
        # Vincular usuario receptor si no estaba
        inv_invitee_user_id = getattr(inv, "invitee_user_id", None)
        if inv_invitee_user_id is not None and inv_invitee_user_id != user.id:
            raise HTTPException(status_code=409, detail="Invitación ya asociada a otro usuario")
        setattr(inv, "invitee_user_id", user.id)
        if not body.accept:
            setattr(inv, "status", "REJECTED")
            db.commit()
            inv_id = int(getattr(inv, "id"))
            inv_token = str(getattr(inv, "token"))
            inv_status = str(getattr(inv, "status"))
            inv_expires_at2 = getattr(inv, "expires_at", None)
            return InvitationCreatedResponse(id=inv_id, token=inv_token, status=inv_status, expires_at=inv_expires_at2.isoformat() if inv_expires_at2 else None)
        requested = _parse_scopes(getattr(inv, "requested_scopes", None))
        final_scopes = requested
        if body.scopes:
            subset = body.scopes.dict()
            # Asegurar subset
            for k, v in subset.items():
                if k in requested and requested[k] and v:
                    continue
                if k in requested and not requested[k] and v:
                    # No se puede escalar un scope no solicitado
                    subset[k] = False
            final_scopes = {k: bool(subset.get(k, False)) for k in requested.keys()}
        setattr(inv, "granted_scopes", json.dumps(final_scopes))
        setattr(inv, "status", "CONSENT_GIVEN")
        setattr(inv, "consented_at", _now_utc())
        db.commit()
        # Extraer inmediatamente (sincrónico). En producción: delegar a cola async.
        identity_summary: dict | None = None
        try:
            extract_authorized_data(int(getattr(inv, "id")))
            logger.info("sharing.consent.extracted", extra={"invitation_id": getattr(inv,'id',None)})
            # Intentar recuperar snapshot de identidad recién creado para resumen email
            granted_scopes = _parse_scopes(getattr(inv, "granted_scopes", None))
            if granted_scopes.get("identity"):
                snaps = (
                    db.query(SharingSnapshot)
                    .filter(SharingSnapshot.invitation_id == inv.id, SharingSnapshot.data_type == "identity")
                    .order_by(SharingSnapshot.fetched_at.desc())
                    .limit(1)
                    .all()
                )
                if snaps:
                    try:
                        identity_payload = snaps[0].payload.decode("utf-8")
                        import json as _json
                        raw_id_payload = _json.loads(identity_payload)
                        # Extraer owners si existen
                        owners = []
                        accounts = raw_id_payload.get("accounts") if isinstance(raw_id_payload, dict) else None
                        if isinstance(accounts, list):
                            for acct in accounts:
                                if isinstance(acct, dict):
                                    for o in acct.get("owners", []) or []:
                                        if isinstance(o, dict):
                                            owners.append({
                                                "names": o.get("names"),
                                                "emails": o.get("emails"),
                                                "addresses": o.get("addresses"),
                                            })
                        identity_summary = {"owners": owners[:5]}  # limitar
                    except Exception:
                        identity_summary = None
        except Exception:
            identity_summary = None  # no bloquear consentimiento
        # Notificar al inviter (background)
        try:
            inviter_email = inv.inviter.email if inv.inviter else None
            invitee_email = str(user.email)
            if inviter_email:
                # Email 1: consentimiento general
                background_tasks.add_task(send_consent_granted_email, str(inviter_email), invitee_email)  # type: ignore[arg-type]
                logger.info("sharing.consent.email.scheduled", extra={"invitation_id": getattr(inv,'id',None), "inviter": inviter_email})
                # Email 2 (opcional): resumen identidad si disponible
                if identity_summary and identity_summary.get("owners"):
                    background_tasks.add_task(send_identity_shared_email, str(inviter_email), invitee_email, identity_summary)  # type: ignore[arg-type]
                    raw_owners_val = identity_summary.get('owners')
                    if isinstance(raw_owners_val, list):
                        owners_list: list = raw_owners_val
                    else:
                        owners_list = []
                    logger.info(
                        "sharing.identity_shared.email.scheduled",
                        extra={
                            "invitation_id": getattr(inv,'id',None),
                            "inviter": inviter_email,
                            "owners_count": len(owners_list),
                        },
                    )
        except Exception:
            logger.debug("Fallo notificación consentimiento/identidad", exc_info=True)
        inv_id = int(getattr(inv, "id"))
        inv_token = str(getattr(inv, "token"))
        inv_status = str(getattr(inv, "status"))
        inv_expires_at3 = _as_aware_utc(getattr(inv, "expires_at", None))
        return InvitationCreatedResponse(id=inv_id, token=inv_token, status=inv_status, expires_at=inv_expires_at3.isoformat() if inv_expires_at3 else None)


@router.get("/invitations/mine")
def list_my_invitations(limit: int = 20, offset: int = 0, user: User = Depends(get_current_user)):
    """Lista paginada de invitaciones creadas por el usuario. Devuelve {items, total}"""
    if limit <= 0:
        limit = 20
    if limit > 100:
        limit = 100
    if offset < 0:
        offset = 0
    with SessionLocal() as db:
        q = (
            db.query(SharingInvitation)
            .filter(SharingInvitation.inviter_user_id == user.id)
            .order_by(SharingInvitation.id.desc())
        )
        total = q.count()
        rows = q.limit(limit).offset(offset).all()
        items: list = []
        for r in rows:
            items.append(
                InvitationListItem(
                    id=int(getattr(r, "id")),
                    invitee_email=str(getattr(r, "invitee_email")),
                    status=str(getattr(r, "status")),
                    created_at=(getattr(r, "created_at").isoformat() if getattr(r, "created_at", None) else ""),
                    consented_at=(getattr(r, "consented_at").isoformat() if getattr(r, "consented_at", None) else None),
                )
            )
        return JSONResponse(content={"items": [i.dict() for i in items], "total": total})
    

@router.get("/invitations/{invitation_id}", response_model=InvitationListItem)
def get_invitation(invitation_id: int, user: User = Depends(get_current_user)):
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        return InvitationListItem(
            id=int(getattr(inv, "id")),
            invitee_email=str(getattr(inv, "invitee_email")),
            status=str(getattr(inv, "status")),
            created_at=(getattr(inv, "created_at").isoformat() if getattr(inv, "created_at", None) else ""),
            consented_at=(getattr(inv, "consented_at").isoformat() if getattr(inv, "consented_at", None) else None),
        )


@router.get("/invitations/as-invitee")
def list_where_i_am_invitee(limit: int = 20, offset: int = 0, user: User = Depends(get_current_user)):
    if limit <= 0:
        limit = 20
    if limit > 100:
        limit = 100
    if offset < 0:
        offset = 0
    with SessionLocal() as db:
        q = (
            db.query(SharingInvitation)
            .filter(SharingInvitation.invitee_user_id == user.id)
            .order_by(SharingInvitation.id.desc())
        )
        total = q.count()
        rows = q.limit(limit).offset(offset).all()
        items: list = []
        for r in rows:
            items.append(
                InvitationListItem(
                    id=int(getattr(r, "id")),
                    invitee_email=str(getattr(r, "invitee_email")),
                    status=str(getattr(r, "status")),
                    created_at=(getattr(r, "created_at").isoformat() if getattr(r, "created_at", None) else ""),
                    consented_at=(getattr(r, "consented_at").isoformat() if getattr(r, "consented_at", None) else None),
                )
            )
        return JSONResponse(content={"items": [i.dict() for i in items], "total": total})

@router.delete("/invitations/{invitation_id}")
async def delete_invitation(invitation_id: int, user: User = Depends(get_current_user)):
    """Elimina definitivamente una invitación (solo el creador)."""
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        if getattr(inv, "inviter_user_id") != user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        db.delete(inv)
        db.commit()
        logger.info("sharing.invitation.deleted", extra={"invitation_id": invitation_id, "user_id": getattr(user,'id',None)})
        return {"deleted": True}


@router.post("/invitations/{invitation_id}/revoke", response_model=InvitationCreatedResponse)
async def revoke_invitation(invitation_id: int, background_tasks: BackgroundTasks, body: RevokeBody | None = None, user: User = Depends(get_current_user)):
    logger.info("sharing.revoke.request", extra={"invitation_id": invitation_id, "user_id": getattr(user,'id',None)})
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        if getattr(inv, "inviter_user_id") != user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        inv_status = str(getattr(inv, "status"))
        if inv_status in {"REVOKED", "EXPIRED"}:
            inv_id = int(getattr(inv, "id"))
            inv_token = str(getattr(inv, "token"))
            inv_expires_at = getattr(inv, "expires_at", None)
            return InvitationCreatedResponse(id=inv_id, token=inv_token, status=inv_status, expires_at=inv_expires_at.isoformat() if inv_expires_at else None)
        setattr(inv, "status", "REVOKED")
        setattr(inv, "revoked_at", _now_utc())
        db.commit()
        logger.info("sharing.revoke.done", extra={"invitation_id": getattr(inv,'id',None)})
        # Notificar a invitee (background)
        try:
            inviter_email = inv.inviter.email if inv.inviter else None
            invitee_email = inv.invitee.email if inv.invitee else None
            if invitee_email and inviter_email:
                background_tasks.add_task(send_revoked_email, invitee_email, inviter_email)
                logger.info("sharing.revoke.email.scheduled", extra={"invitation_id": getattr(inv,'id',None), "invitee": invitee_email})
        except Exception:
            logger.debug("Fallo notificación revocación", exc_info=True)
        inv_id = int(getattr(inv, "id"))
        inv_token = str(getattr(inv, "token"))
        inv_status2 = str(getattr(inv, "status"))
        inv_expires_at2 = getattr(inv, "expires_at", None)
        return InvitationCreatedResponse(id=inv_id, token=inv_token, status=inv_status2, expires_at=inv_expires_at2.isoformat() if inv_expires_at2 else None)


@router.get("/shared/{invitation_id}/snapshots", response_model=List[SnapshotView])
def get_shared_data(invitation_id: int, user: User = Depends(get_current_user)):
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        if int(getattr(inv, "inviter_user_id")) != user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        inv_expires_at = _as_aware_utc(getattr(inv, "expires_at", None))
        inv_status = str(getattr(inv, "status"))
        if inv_expires_at is not None and inv_expires_at < _now_utc() and inv_status not in {"EXPIRED"}:
            setattr(inv, "status", "EXPIRED")
            db.commit()
            inv_status = "EXPIRED"
        # Obtener todos los snapshots de la invitación
        snaps = (
            db.query(SharingSnapshot)
            .filter(SharingSnapshot.invitation_id == inv.id)
            .order_by(SharingSnapshot.data_type.asc(), SharingSnapshot.fetched_at.desc())
            .all()
        )
        latest: Dict[str, SharingSnapshot] = {}
        for s in snaps:
            dt = str(getattr(s, "data_type"))
            if dt not in latest:
                latest[dt] = s
        result: List[SnapshotView] = []
        # Mostrar siempre los snapshots de identidad y balance si existen
        for dt in ["identity", "balance"]:
            if dt in latest:
                s = latest[dt]
                try:
                    payload_dict = json.loads(getattr(s, "payload").decode("utf-8"))
                except Exception:
                    payload_dict = {}
                result.append(
                    SnapshotView(
                        data_type=dt,
                        payload=payload_dict,
                        fetched_at=(getattr(s, "fetched_at").isoformat() if getattr(s, "fetched_at", None) else ""),
                    )
                )
        # Para los demás tipos, solo si la invitación está en CONSENT_GIVEN
        if inv_status == "CONSENT_GIVEN":
            for dt, s in latest.items():
                if dt in ["identity", "balance"]:
                    continue
                try:
                    payload_dict = json.loads(getattr(s, "payload").decode("utf-8"))
                except Exception:
                    payload_dict = {}
                result.append(
                    SnapshotView(
                        data_type=dt,
                        payload=payload_dict,
                        fetched_at=(getattr(s, "fetched_at").isoformat() if getattr(s, "fetched_at", None) else ""),
                    )
                )
        return result


class RefreshResponse(BaseModel):
    refreshed: bool
    invitation_status: str


@router.get("/shared/{invitation_id}/history", response_model=List[SnapshotView])
def get_snapshot_history(invitation_id: int, user: User = Depends(get_current_user)):
    """Devuelve historial completo de snapshots para auditoría (solo inviter)."""
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        if int(getattr(inv, "inviter_user_id")) != user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        snaps = (
            db.query(SharingSnapshot)
            .filter(SharingSnapshot.invitation_id == inv.id)
            .order_by(SharingSnapshot.fetched_at.desc())
            .all()
        )
        out: List[SnapshotView] = []
        for s in snaps:
            try:
                payload_dict = json.loads(getattr(s, "payload").decode("utf-8"))
            except Exception:
                payload_dict = {}
            out.append(
                SnapshotView(
                    data_type=str(getattr(s, "data_type")),
                    payload=payload_dict,
                    fetched_at=(getattr(s, "fetched_at").isoformat() if getattr(s, "fetched_at", None) else ""),
                )
            )
        return out


@router.post("/shared/{invitation_id}/refresh", response_model=RefreshResponse)
def refresh_shared_data(invitation_id: int, user: User = Depends(get_current_user)):
    """Re-extrae datos autorizados (balance, identity, etc.) si la invitación sigue activa."""
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitación no encontrada")
        if int(getattr(inv, "inviter_user_id")) != user.id:
            raise HTTPException(status_code=403, detail="No autorizado")
        inv_expires_at = _as_aware_utc(getattr(inv, "expires_at", None))
        inv_status = str(getattr(inv, "status"))
        if inv_expires_at is not None and inv_expires_at < _now_utc() and inv_status not in {"EXPIRED"}:
            setattr(inv, "status", "EXPIRED")
            db.commit()
            return RefreshResponse(refreshed=False, invitation_status="EXPIRED")
        if inv_status != "CONSENT_GIVEN":
            return RefreshResponse(refreshed=False, invitation_status=inv_status)
    try:
        extract_authorized_data(invitation_id)
        logger.info("sharing.refresh.success", extra={"invitation_id": invitation_id})
        return RefreshResponse(refreshed=True, invitation_status="CONSENT_GIVEN")
    except Exception:
        logger.warning("sharing.refresh.failed", extra={"invitation_id": invitation_id}, exc_info=True)
        return RefreshResponse(refreshed=False, invitation_status="CONSENT_GIVEN")


# Placeholder para extracción (podría moverse a un servicio y llamar desde un scheduler o trigger)
def extract_authorized_data(invitation_id: int):  # noqa: D401
    """Extrae datos autorizados de Plaid y guarda snapshots.

    Estrategia: balance -> accounts/balance; identity -> identity; transactions -> (future) list; investments -> (future).
    Se asume que el invitee ya vinculó un PlaidItem. Si múltiples, se usa el más reciente.
    """
    from app.integrations.plaid.routes.core import get_accounts  # reuse logic if desired
    from app.integrations.plaid.routes.identity import get_identity
    with SessionLocal() as db:
        inv = db.query(SharingInvitation).filter(SharingInvitation.id == invitation_id).first()
        if not inv:
            return
        inv_status = str(getattr(inv, "status"))
        inv_invitee_user_id = getattr(inv, "invitee_user_id", None)
        if inv_status != "CONSENT_GIVEN" or inv_invitee_user_id is None:
            return
        granted = getattr(inv, "granted_scopes", None)
        scopes = _parse_scopes(granted) if granted else {}
        # Obtener access token del invitee
        token = latest_access_token(str(inv_invitee_user_id))
        if not token:
            return
        client = plaid_client()
        # Balance snapshot (sanitizado)
        if scopes.get("balance"):
            try:
                from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest  # type: ignore
                req = AccountsBalanceGetRequest(access_token=token)
                resp = client.accounts_balance_get(req)
                raw = getattr(resp, "to_dict", lambda: resp)()
                sanitized_accounts = []
                for acct in raw.get("accounts", []):  # type: ignore
                    if isinstance(acct, dict):
                        sanitized_accounts.append({
                            "account_id": acct.get("account_id"),
                            "balances": acct.get("balances"),
                            "name": acct.get("name"),
                            "official_name": acct.get("official_name"),
                            "type": acct.get("type"),
                            "subtype": acct.get("subtype"),
                        })
                payload = {"accounts": sanitized_accounts, "item": raw.get("item")}
                _upsert_snapshot(db, int(getattr(inv, "id")), "balance", payload)
            except Exception:
                logger.debug("Fallo snapshot balance", exc_info=True)
        if scopes.get("identity"):
            try:
                # Reutilizar lógica interna de endpoint identity (aunque allí espera user actual; aquí adaptamos)
                from plaid.model.identity_get_request import IdentityGetRequest  # type: ignore
                req = IdentityGetRequest(access_token=token)
                resp = client.identity_get(req)
                raw = getattr(resp, "to_dict", lambda: resp)()
                # Guardar JSON completo devuelto por Plaid para identidad
                _upsert_snapshot(db, int(getattr(inv, "id")), "identity", raw)
            except Exception:
                logger.debug("Fallo snapshot identity", exc_info=True)
        else:
            try:
                logger.info("sharing.identity.scope_disabled", extra={"invitation_id": getattr(inv, 'id', None)})
            except Exception:
                pass
        if scopes.get("transactions") and any(p.lower() == "transactions" for p in PLAID_PRODUCTS):
            try:
                from plaid.model.transactions_get_request import TransactionsGetRequest  # type: ignore
                from datetime import date, timedelta as _td
                end_date = date.today()
                start_date = end_date - _td(days=30)
                req = TransactionsGetRequest(access_token=token, start_date=start_date, end_date=end_date, options={"count": 50, "offset": 0})
                resp = client.transactions_get(req)
                raw = getattr(resp, "to_dict", lambda: resp)()
                txs = raw.get("transactions", []) if isinstance(raw, dict) else []
                sanitized_tx = []
                for t in txs:
                    if isinstance(t, dict):
                        sanitized_tx.append({
                            "transaction_id": t.get("transaction_id"),
                            "name": t.get("name"),
                            "amount": t.get("amount"),
                            "date": t.get("date"),
                            "pending": t.get("pending"),
                            "account_id": t.get("account_id"),
                            "category": t.get("category"),
                            "payment_channel": t.get("payment_channel"),
                        })
                payload = {"transactions": sanitized_tx, "total": len(sanitized_tx)}
                _upsert_snapshot(db, int(getattr(inv, "id")), "transactions", payload)
            except Exception:
                logger.debug("Fallo snapshot transactions", exc_info=True)
        # TODO: transactions, investments
        db.commit()


class ExpireResult(BaseModel):
    expired: int


@router.post("/admin/expire", response_model=ExpireResult, dependencies=[Depends(require_admin)])
def force_expire():
    """Forzar expiración batch de invitaciones (uso admin/manual)."""
    from app.scripts.expire_sharing_invitations import expire_batch
    total = 0
    while True:
        n = expire_batch()
        if not n:
            break
        total += n
    logger.info("sharing.expire.batch", extra={"expired": total})
    return ExpireResult(expired=total)


def _upsert_snapshot(db, invitation_id: int, data_type: str, payload_obj):
    """Now always INSERT (historical). Name preserved for minimal diff."""
    try:
        raw = payload_obj if isinstance(payload_obj, dict) else payload_obj.to_dict()  # type: ignore[attr-defined]
    except Exception:
        raw = {}
    data_bin = json.dumps(raw).encode("utf-8")
    row = SharingSnapshot(
        invitation_id=invitation_id,
        data_type=data_type,
        payload=data_bin,
    )
    db.add(row)
