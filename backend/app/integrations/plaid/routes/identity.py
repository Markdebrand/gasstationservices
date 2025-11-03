from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Optional

from ..plaid_storage import latest_access_token
from .shared import plaid_client

try:
    from plaid.model.identity_get_request import IdentityGetRequest
except Exception:
    IdentityGetRequest = None  # type: ignore[assignment]

from app.core.auth.session_manager import get_current_user
from app.db import models as db_models
from app.db.database import SessionLocal
import logging
try:
    from app.db.models import SharingInvitation, SharingSnapshot  # type: ignore
except Exception:  # pragma: no cover
    SharingInvitation = None  # type: ignore
    SharingSnapshot = None  # type: ignore


router = APIRouter()
logger = logging.getLogger("app.plaid.identity")


class IdentityOwnerAddress(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None  # state/province
    postal_code: Optional[str] = None
    country: Optional[str] = None


class IdentityOwner(BaseModel):
    names: list[str] | None = None
    phone_numbers: list[dict] | None = None  # { data: str, primary: bool }
    emails: list[dict] | None = None        # { data: str, primary: bool }
    addresses: list[dict] | None = None     # { data: IdentityOwnerAddress, primary: bool }


class PlaidIdentityAccount(BaseModel):
    account_id: Optional[str] = None
    name: Optional[str] = None
    official_name: Optional[str] = None
    mask: Optional[str] = None
    type: Optional[str] = None
    subtype: Optional[str] = None
    owners: list[IdentityOwner] | None = None


class IdentityResponse(BaseModel):
    accounts: list[PlaidIdentityAccount]


def _to_dict(obj: Any) -> Any:
    try:
        if hasattr(obj, "to_dict"):
            return obj.to_dict()  # type: ignore[attr-defined]
    except Exception:
        pass
    return obj


def _normalize_address(addr: Any) -> dict:
    a = _to_dict(addr) or {}
    # Plaid may already return { data: {...}, primary: bool }
    if isinstance(a, dict) and "data" in a:
        data = _to_dict(a.get("data")) or {}
        return {
            "data": {
                "street": data.get("street") or data.get("street1") or data.get("line1"),
                "city": data.get("city"),
                "region": data.get("region") or data.get("state"),
                "postal_code": data.get("postal_code") or data.get("zip"),
                "country": data.get("country"),
            },
            "primary": bool(a.get("primary")),
        }
    # Fallback if flat structure
    return {
        "data": {
            "street": a.get("street") or a.get("street1") or a.get("line1"),
            "city": a.get("city"),
            "region": a.get("region") or a.get("state"),
            "postal_code": a.get("postal_code") or a.get("zip"),
            "country": a.get("country"),
        },
        "primary": bool(a.get("primary")),
    }


def _normalize_contact(item: Any) -> dict:
    v = _to_dict(item) or {}
    if isinstance(v, dict) and ("data" in v or "primary" in v):
        return {"data": v.get("data"), "primary": bool(v.get("primary"))}
    # Fallback if it's a string
    if isinstance(v, str):
        return {"data": v, "primary": False}
    # Otherwise try to pick common fields
    return {"data": v.get("data") or v.get("value"), "primary": bool(v.get("primary"))}


def _map_owner(owner: Any) -> IdentityOwner:
    o = _to_dict(owner) or {}
    names = o.get("names")
    if isinstance(names, str):
        names = [names]
    elif not isinstance(names, list):
        names = None

    emails_raw = o.get("emails") or []
    phones_raw = o.get("phone_numbers") or []
    addrs_raw = o.get("addresses") or []

    emails = [_normalize_contact(e) for e in emails_raw] if isinstance(emails_raw, list) else None
    phone_numbers = [_normalize_contact(p) for p in phones_raw] if isinstance(phones_raw, list) else None
    addresses = [_normalize_address(a) for a in addrs_raw] if isinstance(addrs_raw, list) else None

    return IdentityOwner(names=names, emails=emails, phone_numbers=phone_numbers, addresses=addresses)


class IdentityAccessTokenBody(BaseModel):
    access_token: str | None = None


def _resolve_identity_token(user: db_models.User, override: str | None) -> str:
    if override:
        return override
    token = latest_access_token(str(user.id))
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    return token


def _maybe_persist_identity_snapshot(user: db_models.User, access_token: str) -> None:
    """Best-effort: if there's an active consented invitation for this invitee with
    identity scope granted, fetch raw Plaid Identity JSON and store a SharingSnapshot
    so the inviter can view it in their history.

    Any errors are swallowed to avoid impacting the UX.
    """
    if SharingInvitation is None or SharingSnapshot is None:  # pragma: no cover
        return
    try:
        logger.info(
            "plaid.identity.snapshot.check",
            extra={
                "user_id": getattr(user, "id", None),
            },
        )
        with SessionLocal() as db:
            # Optional: try to match by user's latest Plaid item_id to tighten association
            try:
                from app.db.models import PlaidItem  # type: ignore
            except Exception:
                PlaidItem = None  # type: ignore

            latest_item_id = None
            try:
                if PlaidItem is not None:
                    pi = (
                        db.query(PlaidItem)
                        .filter(PlaidItem.user_id == user.id)
                        .order_by(PlaidItem.id.desc())
                        .first()
                    )
                    if pi is not None:
                        latest_item_id = getattr(pi, "item_id", None)
            except Exception:
                latest_item_id = None

            # 1) Prefer invitations in CONSENT_GIVEN; 2) fallback to LINKED if none
            q = (
                db.query(SharingInvitation)
                .filter(SharingInvitation.invitee_user_id == user.id)
            )
            # If we know the latest item, try to filter by it first
            if latest_item_id:
                q = q.filter(SharingInvitation.plaid_item_id == latest_item_id)
            inv = (
                q.filter(SharingInvitation.status.in_(["CONSENT_GIVEN"]))
                .order_by(SharingInvitation.id.desc())
                .first()
            )
            if not inv:
                inv = (
                    q.filter(SharingInvitation.status.in_(["LINKED"]))
                    .order_by(SharingInvitation.id.desc())
                    .first()
                )
            # Fallback: match by invitee email if user hasn't been linked on the invitation
            if not inv:
                try:
                    user_email = (getattr(user, "email", None) or "").lower()
                except Exception:
                    user_email = ""
                if user_email:
                    q2 = db.query(SharingInvitation).filter(SharingInvitation.invitee_email == user_email)
                    if latest_item_id:
                        q2 = q2.filter(SharingInvitation.plaid_item_id == latest_item_id)
                    inv = (
                        q2.filter(SharingInvitation.status.in_(["CONSENT_GIVEN", "LINKED", "PENDING"]))
                        .order_by(SharingInvitation.id.desc())
                        .first()
                    )
            if not inv:
                logger.info(
                    "plaid.identity.snapshot.no_invitation",
                    extra={"user_id": getattr(user, "id", None)},
                )
                return
            logger.info(
                "plaid.identity.snapshot.invitation_found",
                extra={
                    "invitation_id": getattr(inv, "id", None),
                    "status": getattr(inv, "status", None),
                    "matched_item": bool(latest_item_id),
                },
            )
            granted_raw = getattr(inv, "granted_scopes", None)
            scopes = {}
            if isinstance(granted_raw, str) and granted_raw.strip():
                try:
                    import json as _json
                    scopes = {k: bool(v) for k, v in (_json.loads(granted_raw) or {}).items()}
                except Exception:
                    scopes = {}
            # Fallback to requested_scopes if no granted scopes available yet (e.g., still LINKED)
            if not scopes:
                try:
                    req_raw = getattr(inv, "requested_scopes", None)
                    if isinstance(req_raw, str) and req_raw.strip():
                        import json as _json
                        scopes = {k: bool(v) for k, v in (_json.loads(req_raw) or {}).items()}
                except Exception:
                    pass
            # Guardar snapshot de identidad si el scope está activo
            completed = False
            if scopes.get("identity"):
                if IdentityGetRequest is None:
                    logger.warning("plaid.identity.snapshot.sdk_missing")
                    return
                client = plaid_client()
                req = IdentityGetRequest(access_token=access_token)
                resp = client.identity_get(req)
                try:
                    raw = resp.to_dict()  # type: ignore[attr-defined]
                except Exception:
                    raw = {}
                import json as _json
                data_bin = _json.dumps(raw if isinstance(raw, dict) else {}).encode("utf-8")
                row = SharingSnapshot(
                    invitation_id=int(getattr(inv, "id")),
                    data_type="identity",
                    payload=data_bin,
                )
                db.add(row)
                db.commit()
                completed = True
                logger.info(
                    "plaid.identity.snapshot.saved",
                    extra={
                        "invitation_id": getattr(inv, "id", None),
                        "payload_size": len(data_bin),
                    },
                )

            # Guardar snapshot de balance si el scope está activo
            if scopes.get("balance"):
                try:
                    from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest  # type: ignore
                    client = plaid_client()
                    req = AccountsBalanceGetRequest(access_token=access_token)
                    resp = client.accounts_balance_get(req)
                    raw = getattr(resp, "to_dict", lambda: resp)()
                    sanitized_accounts = []
                    for acct in raw.get("accounts", []):
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
                    import json as _json
                    data_bin = _json.dumps(payload).encode("utf-8")
                    row = SharingSnapshot(
                        invitation_id=int(getattr(inv, "id")),
                        data_type="balance",
                        payload=data_bin,
                    )
                    db.add(row)
                    db.commit()
                    completed = True
                    logger.info(
                        "plaid.balance.snapshot.saved",
                        extra={
                            "invitation_id": getattr(inv, "id", None),
                            "payload_size": len(data_bin),
                        },
                    )
                except Exception:
                    logger.debug("plaid.balance.snapshot.error", exc_info=True)
            # Si se guardó algún snapshot, actualizar status a COMPLETED
            if completed and getattr(inv, "status", None) in ["PENDING", "LINKED", "CONSENT_GIVEN"]:
                setattr(inv, "status", "COMPLETED")
                db.commit()
    except Exception:
        logger.debug("plaid.identity.snapshot.error", exc_info=True)


def _fetch_identity(token: str) -> list[dict]:
    if IdentityGetRequest is None:
        raise HTTPException(status_code=500, detail="SDK de Plaid no instalado")
    client = plaid_client()
    req = IdentityGetRequest(access_token=token)
    resp = client.identity_get(req)
    payload = _to_dict(resp) or resp  # type: ignore[assignment]

    accounts_raw = []
    if isinstance(payload, dict):
        accounts_raw = payload.get("accounts", []) or []
    else:
        try:
            accounts_raw = resp["accounts"]  # type: ignore[index]
        except Exception:
            accounts_raw = []

    accounts: list[dict] = []
    for acct in accounts_raw:
        a = _to_dict(acct) or {}
        owners_raw = a.get("owners") or []
        mapped = {
            "account_id": a.get("account_id"),
            "name": a.get("name"),
            "official_name": a.get("official_name"),
            "mask": a.get("mask"),
            "type": a.get("type"),
            "subtype": a.get("subtype"),
            "owners": [_map_owner(o) for o in owners_raw] if isinstance(owners_raw, list) else None,
        }
        accounts.append(mapped)
    return accounts


@router.get("/identity", response_model=IdentityResponse)
def get_identity(user: db_models.User = Depends(get_current_user)):
    try:
        token = _resolve_identity_token(user, None)
        accounts = _fetch_identity(token)
        _maybe_persist_identity_snapshot(user, token)
        return IdentityResponse(accounts=accounts)  # type: ignore[arg-type]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo identidad: {e}")


@router.post("/identity", response_model=IdentityResponse)
def post_identity(body: IdentityAccessTokenBody | None = None, user: db_models.User = Depends(get_current_user)):
    try:
        token = _resolve_identity_token(user, body.access_token if body else None)
        accounts = _fetch_identity(token)
        _maybe_persist_identity_snapshot(user, token)
        return IdentityResponse(accounts=accounts)  # type: ignore[arg-type]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo identidad: {e}")
