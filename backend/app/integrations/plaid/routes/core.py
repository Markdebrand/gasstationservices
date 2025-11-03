from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.config.settings import (
    PLAID_PRODUCTS,
    PLAID_COUNTRY_CODES,
    PLAID_REDIRECT_URI,
    PLAID_ENV,
    PLAID_CLIENT_ID,
    PLAID_SECRET,
)
from ..plaid_storage import init_db, save_access_token, latest_access_token, list_items
from .shared import plaid_client

init_db()

try:
    from plaid.model.link_token_create_request import LinkTokenCreateRequest
    from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
    from plaid.model.products import Products
    from plaid.model.country_code import CountryCode
    from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
    from plaid.model.accounts_get_request import AccountsGetRequest
    from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
    from plaid.model.auth_get_request import AuthGetRequest
except Exception:
    pass

router = APIRouter()


class LinkTokenResponse(BaseModel):
    link_token: str
    expiration: str


class CreateLinkTokenBody(BaseModel):
    access_token: Optional[str] = None


from app.core.auth.session_manager import get_current_user
from app.db import models as db_models
from app.db.database import SessionLocal


@router.post("/create_link_token", response_model=LinkTokenResponse)
def create_link_token(body: CreateLinkTokenBody | None = None, user: db_models.User = Depends(get_current_user)):
    client = plaid_client()
    try:
        client_user_id = str(getattr(user, "id", "demo-user-123")) or "demo-user-123"
        user_in = LinkTokenCreateRequestUser(client_user_id=client_user_id)
        # Base kwargs common to all flows
        kwargs = dict(
            user=user_in,
            client_name="HSOTrade",
            country_codes=[CountryCode(code) for code in PLAID_COUNTRY_CODES],
            language="en",
        )
        # For update mode, pass ONLY access_token (no products). For initial link, include products.
        if body and body.access_token:
            kwargs["access_token"] = body.access_token
        else:
            kwargs["products"] = [Products(p) for p in PLAID_PRODUCTS]
        if PLAID_REDIRECT_URI and PLAID_ENV.lower() != "sandbox":
            kwargs["redirect_uri"] = PLAID_REDIRECT_URI
        request = LinkTokenCreateRequest(**kwargs)  # type: ignore[arg-type]
        resp = client.link_token_create(request)
        link_token = getattr(resp, "link_token", None) or resp.get("link_token")  # type: ignore
        expiration = getattr(resp, "expiration", None) or resp.get("expiration")  # type: ignore
        if not link_token:
            raise RuntimeError("Respuesta sin link_token")
        if hasattr(expiration, "isoformat"):
            try:
                expiration = expiration.isoformat()  # type: ignore[attr-defined]
            except Exception:
                expiration = str(expiration)
        return LinkTokenResponse(link_token=link_token, expiration=str(expiration or ""))
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"Error creando link token: {type(e).__name__}: {e}")


class ExchangePublicTokenRequest(BaseModel):
    public_token: str
    invitation_token: str | None = None  # opcional: vincular a SharingInvitation


class ExchangePublicTokenResponse(BaseModel):
    item_id: str
    items: list
    access_token: str  # añadido para invitados (no guardado en BD)
    invitation_id: int | None = None
    invitation_status: str | None = None


_ACCESS_TOKENS: list[str] = []  # legacy in-memory


@router.post("/exchange_public_token", response_model=ExchangePublicTokenResponse)
def exchange_public_token(body: ExchangePublicTokenRequest, user: db_models.User = Depends(get_current_user)):
    user_id = str(user.id)
    client = plaid_client()
    try:
        print(f"[Plaid] Recibido public_token: {body.public_token}")
        req = ItemPublicTokenExchangeRequest(public_token=body.public_token)
        resp = client.item_public_token_exchange(req)
        print(f"[Plaid] Respuesta: {resp}")
        access_token = resp["access_token"]  # type: ignore
        item_id = resp["item_id"]  # type: ignore
        _ACCESS_TOKENS.append(access_token)
        # Guardado del plaid_item:
        # - Regla anterior evitaba guardar si el usuario tenía rol 'cliente'.
        # - Para el flujo de 'invitaciones' necesitamos el token persistido (cifrado)
        #   para poder extraer y guardar snapshots vinculados al invitador.
        # - Por ello, si viene invitation_token válido para este usuario, guardamos SIEMPRE.
        user_role = getattr(user, "role", None)
        should_persist_token = True
        invitation_id = None
        invitation_status = None
        if user_role and user_role.lower() == "cliente":
            should_persist_token = False  # por defecto no guardar para clientes
        
        if body.invitation_token:
            # Vincular invitación si existe y pertenece (o aún no vinculada) a este usuario como invitee
            from app.db.database import SessionLocal
            from app.db.models import SharingInvitation
            from datetime import datetime, timezone
            now_utc = datetime.now(timezone.utc)
            with SessionLocal() as db:
                inv = (
                    db.query(SharingInvitation)
                    .filter(SharingInvitation.token == body.invitation_token)
                    .first()
                )
                if inv is not None:
                    inv_expires_at = getattr(inv, "expires_at", None)
                    inv_status = getattr(inv, "status", None)
                    inv_invitee_user_id = getattr(inv, "invitee_user_id", None)
                    if inv_expires_at and inv_expires_at < now_utc:
                        if inv_status not in {"EXPIRED", "REVOKED", "REJECTED"}:
                            setattr(inv, "status", "EXPIRED")
                            db.commit()
                        invitation_status = "EXPIRED"
                    else:
                        if inv_invitee_user_id is not None and inv_invitee_user_id != user.id:
                            # Otro usuario ya la tomó: silencioso
                            pass
                        else:
                            if inv_invitee_user_id is None:
                                setattr(inv, "invitee_user_id", user.id)
                            setattr(inv, "plaid_item_id", item_id)
                            if inv_status == "PENDING":
                                setattr(inv, "status", "LINKED")
                            invitation_id = int(getattr(inv, "id"))  # type: ignore[arg-type]
                            invitation_status_val = getattr(inv, "status")
                            invitation_status = str(invitation_status_val) if invitation_status_val is not None else None
                            db.commit()
                            # En este contexto (flujo por invitación) SÍ persistimos el token aunque sea 'cliente'
                            should_persist_token = True
                # Si no existe, se ignora para evitar enumeración

        if should_persist_token:
            save_access_token(user_id, item_id, access_token, None)
        else:
            print(f"[Plaid] Usuario 'cliente' sin invitación: no se guarda plaid_item en la base de datos.")
        return ExchangePublicTokenResponse(
            item_id=item_id,
            items=list_items(user_id),
            access_token=access_token,
            invitation_id=invitation_id,
            invitation_status=invitation_status,
        )
    except Exception as e:  # pragma: no cover
        print(f"[Plaid] Error en exchange_public_token: {e}")
        raise HTTPException(status_code=400, detail=f"Error exchange public token: {e}")


class AccountsResponse(BaseModel):
    accounts: list


class AccessTokenOptionalBody(BaseModel):
    """Permite que el frontend envíe opcionalmente un access_token específico.

    Si no se provee, se usará el último token guardado para el usuario.
    """

    access_token: str | None = None


def _resolve_access_token(user: db_models.User, override: str | None) -> str:
    if override:
        return override
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    return token


def _fetch_accounts(token: str):
    client = plaid_client()
    req = AccountsGetRequest(access_token=token)
    resp = client.accounts_get(req)
    raw_accounts = resp["accounts"]  # type: ignore

    def _account_to_dict(acct):
        try:
            if hasattr(acct, "to_dict"):
                return acct.to_dict()  # type: ignore[attr-defined]
        except Exception:
            pass
        if isinstance(acct, dict):
            return acct
        data = {}
        for attr in ("account_id", "name", "official_name", "mask", "subtype", "type"):
            if hasattr(acct, attr):
                data[attr] = getattr(acct, attr)
        bal = getattr(acct, "balances", None)
        if bal is not None:
            try:
                if hasattr(bal, "to_dict"):
                    data["balances"] = bal.to_dict()  # type: ignore[attr-defined]
                elif isinstance(bal, dict):
                    data["balances"] = bal
            except Exception:
                pass
        return data

    return [_account_to_dict(a) for a in raw_accounts]


@router.get("/accounts", response_model=AccountsResponse)
def get_accounts(user: db_models.User = Depends(get_current_user)):
    """Versión GET tradicional (usa último token)."""
    try:
        token = _resolve_access_token(user, None)
        accounts = _fetch_accounts(token)
        return AccountsResponse(accounts=accounts)
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"Error obteniendo cuentas: {e}")


@router.post("/accounts", response_model=AccountsResponse)
def post_accounts(body: AccessTokenOptionalBody | None = None, user: db_models.User = Depends(get_current_user)):
    """Endpoint POST para compatibilidad con frontend (envía JSON).

    Acepta opcionalmente un access_token para usar uno específico (por ejemplo, en flujos multi-item).
    """
    try:
        override_token = body.access_token if body else None
        token = _resolve_access_token(user, override_token)
        accounts = _fetch_accounts(token)
        return AccountsResponse(accounts=accounts)
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"Error obteniendo cuentas: {e}")


@router.get("/balance")
def get_balance(user: db_models.User = Depends(get_current_user)):
    """Devuelve balances por cuenta (reusa accounts_get internamente)."""
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    try:
        req = AccountsGetRequest(access_token=token)
        resp = client.accounts_get(req)
        raw_accounts = resp["accounts"]  # type: ignore
        balances = []
        for acct in raw_accounts:
            try:
                if isinstance(acct, dict):
                    acct_id = acct.get("account_id")
                    bal = acct.get("balances", {})
                else:
                    acct_id = getattr(acct, "account_id", None)
                    b = getattr(acct, "balances", None)
                    if b is not None and hasattr(b, "to_dict"):
                        bal = b.to_dict()  # type: ignore[attr-defined]
                    else:
                        bal = b
            except Exception:
                acct_id = None
                bal = {}

            balances.append({"account_id": acct_id, "balances": bal})

        return {"balances": balances}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo balances: {e}")


@router.get("/balance/realtime")
def get_balance_realtime(user: db_models.User = Depends(get_current_user)):
    """Devuelve balances actualizados en tiempo real usando accounts/balance/get."""
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    try:
        req = AccountsBalanceGetRequest(access_token=token)
        resp = client.accounts_balance_get(req)
        raw_accounts = resp["accounts"]  # type: ignore
        balances = []
        for acct in raw_accounts:
            try:
                if isinstance(acct, dict):
                    acct_id = acct.get("account_id")
                    bal = acct.get("balances", {})
                else:
                    acct_id = getattr(acct, "account_id", None)
                    b = getattr(acct, "balances", None)
                    if b is not None and hasattr(b, "to_dict"):
                        bal = b.to_dict()  # type: ignore[attr-defined]
                    else:
                        bal = b
            except Exception:
                acct_id = None
                bal = {}

            balances.append({"account_id": acct_id, "balances": bal})

        return {"balances": balances, "realtime": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo balances en tiempo real: {e}")


@router.get("/auth")
def get_auth(user: db_models.User = Depends(get_current_user)):
    """Llama al endpoint Plaid Auth para obtener account/routing numbers cuando estén disponibles."""
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    try:
        req = AuthGetRequest(access_token=token)
        resp = client.auth_get(req)
        try:
            data = resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            data = resp
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo auth: {e}")


@router.get("/debug-config")
def plaid_debug_config():
    return {
        "client_id_present": bool(PLAID_CLIENT_ID),
        "secret_present": bool(PLAID_SECRET),
        "env": PLAID_ENV,
        "products": PLAID_PRODUCTS,
        "country_codes": PLAID_COUNTRY_CODES,
        "redirect_uri_set": bool(PLAID_REDIRECT_URI),
    }


class ItemsResponse(BaseModel):
    items: list


@router.get("/items", response_model=ItemsResponse)
def get_items(user: db_models.User = Depends(get_current_user)):
    user_id = str(user.id)
    return ItemsResponse(items=list_items(user_id))


class UnlinkBody(BaseModel):
    item_id: str


@router.delete("/unlink")
def unlink_item(body: UnlinkBody, user: db_models.User = Depends(get_current_user)):
    """Remove a linked Plaid item for the current user."""
    with SessionLocal() as db:
        q = (
            db.query(db_models.PlaidItem)
            .filter(db_models.PlaidItem.user_id == user.id, db_models.PlaidItem.item_id == body.item_id)
        )
        deleted = q.delete(synchronize_session=False)
        db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Item no encontrado para el usuario")
    return {"ok": True, "deleted": deleted}
