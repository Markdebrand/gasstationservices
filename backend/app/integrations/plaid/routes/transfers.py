from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..plaid_storage import latest_access_token
from ..plaid_storage import upsert_transfer_status, get_transfer_status
from .shared import plaid_client

try:
    from plaid.model.transfer_authorization_create_request import TransferAuthorizationCreateRequest
    from plaid.model.transfer_authorization_user_in_request import TransferAuthorizationUserInRequest
    from plaid.model.transfer_create_request import TransferCreateRequest
    from plaid.model.transfer_get_request import TransferGetRequest
    from plaid.model.accounts_get_request import AccountsGetRequest
    from plaid.model.transfer_cancel_request import TransferCancelRequest
    from plaid.model.transfer_list_request import TransferListRequest
    from plaid.model.transfer_event_list_request import TransferEventListRequest
    from plaid.model.transfer_network import TransferNetwork
    from plaid.model.transfer_type import TransferType
    from plaid.model.ach_class import ACHClass
except Exception:
    pass

from app.core.auth.session_manager import get_current_user
from app.db import models as db_models


router = APIRouter()


class TransferUser(BaseModel):
    legal_name: str
    email_address: Optional[str] = None
    phone_number: Optional[str] = None


class TransferAuthorizeRequest(BaseModel):
    account_id: str
    amount: str
    type: str = "debit"
    network: str = "ach"
    ach_class: str = "ppd"
    user: TransferUser


@router.post("/transfer/authorize")
def transfer_authorize(body: TransferAuthorizeRequest, user: db_models.User = Depends(get_current_user)):
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    try:
        user_kwargs = {"legal_name": body.user.legal_name}
        if body.user.email_address is not None:
            user_kwargs["email_address"] = body.user.email_address
        if body.user.phone_number is not None:
            user_kwargs["phone_number"] = body.user.phone_number
        req = TransferAuthorizationCreateRequest(
            access_token=token,
            account_id=body.account_id,
            type=TransferType(body.type),
            network=TransferNetwork(body.network),
            amount=body.amount,
            ach_class=ACHClass(body.ach_class),
            user=TransferAuthorizationUserInRequest(**user_kwargs),
        )
        resp = client.transfer_authorization_create(req)
        try:
            data = resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            data = resp

        # Extraer authorization id y status si están presentes y almacenarlos localmente
        auth_id = None
        auth_status = None
        if isinstance(data, dict):
            # Plaid puede devolver authorization.id o authorization.authorization_id
            auth = data.get("authorization") or {}
            if isinstance(auth, dict):
                auth_id = auth.get("id") or auth.get("authorization_id")
                auth_status = auth.get("status") or auth.get("authorization_status")
            # Algunas respuestas incluyen authorization_id en root
            if not auth_id:
                auth_id = data.get("authorization_id") or data.get("id")

        if auth_id:
            try:
                upsert_transfer_status(auth_id, auth_status, data)
            except Exception:
                pass

        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error autorizando transferencia: {e}")


class TransferCreateBody(BaseModel):
    account_id: str
    authorization_id: str
    description: Optional[str] = None
    amount: Optional[str] = None


@router.post("/transfer/create")
def transfer_create(body: TransferCreateBody, user: db_models.User = Depends(get_current_user)):
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    # Validar estado de la autorización almacenada (si existe)
    try:
        auth_row = get_transfer_status(body.authorization_id)
        if auth_row and auth_row.get("status"):
            s = (auth_row.get("status") or "").lower()
            if not ("author" in s or "approv" in s or "authorized" in s or "approved" in s):
                raise HTTPException(status_code=400, detail=f"authorization not approved; status={auth_row.get('status')}")
    except HTTPException:
        raise
    except Exception:
        # Si falla la comprobación no impedimos el flujo; procedemos y dejamos que Plaid responda
        pass

    # Validación del monto vs balance: obtener amount a comprobar (prefer body.amount, sino extraer de autorización almacenada)
    amount_to_check = None
    try:
        if body.amount:
            amount_to_check = body.amount
        elif auth_row and isinstance(auth_row.get("last_payload"), dict):
            lp = auth_row.get("last_payload")
            # buscar en varios lugares comunes
            auth_obj = lp.get("authorization") if isinstance(lp.get("authorization"), dict) else lp.get("transfer_authorization") if isinstance(lp.get("transfer_authorization"), dict) else {} # type: ignore
            amount_to_check = auth_obj.get("amount") or lp.get("amount") or lp.get("authorization_amount") # type: ignore
    except Exception:
        amount_to_check = None

    if amount_to_check is not None:
        # parse amount as float
        try:
            a = float(str(amount_to_check).replace(",", "").strip())
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid amount format: {amount_to_check}")

        # obtener balances via Plaid
        try:
            acct_req = AccountsGetRequest(access_token=token)
            acct_resp = client.accounts_get(acct_req)
            acct_data = None
            try:
                acct_data = acct_resp.to_dict()  # type: ignore[attr-defined]
            except Exception:
                acct_data = acct_resp
            accounts_list = []
            if isinstance(acct_data, dict):
                accounts_list = acct_data.get("accounts", [])
            else:
                try:
                    accounts_list = acct_resp["accounts"]  # type: ignore[index]
                except Exception:
                    accounts_list = []

            # buscar la cuenta destino
            matched = None
            for ac in accounts_list:
                try:
                    aid = ac.get("account_id") if isinstance(ac, dict) else getattr(ac, "account_id", None)
                except Exception:
                    aid = None
                if aid == body.account_id:
                    matched = ac
                    break

            if matched is None:
                raise HTTPException(status_code=400, detail="Account not found in Plaid item; cannot validate balance")

            bal = None
            try:
                if isinstance(matched, dict):
                    bal = matched.get("balances", {}).get("available") or matched.get("balances", {}).get("current")
                else:
                    b = getattr(matched, "balances", None)
                    if b is not None:
                        bal = getattr(b, "available", None) or getattr(b, "current", None)
            except Exception:
                bal = None

            if bal is None:
                raise HTTPException(status_code=400, detail="Account balances not available; cannot validate funds")

            try:
                bal_num = float(str(bal).replace(",", "").strip())
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid balance format: {bal}")

            if a > bal_num:
                raise HTTPException(status_code=400, detail=f"Insufficient funds: transfer amount {a} > available {bal_num}")
        except HTTPException:
            raise
        except Exception as e:
            # si falla la verificación remota, dejar que Plaid responda en la siguiente llamada
            pass

    try:
        req = TransferCreateRequest(
            access_token=token,
            account_id=body.account_id,
            authorization_id=body.authorization_id,
            description=body.description or "HSO Transfer",
        )
        resp = client.transfer_create(req)
        try:
            data = resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            data = resp

        # Si la creación devuelve transfer_id, actualizar estado local
        try:
            transfer_id = None
            if isinstance(data, dict):
                if "transfer" in data and isinstance(data["transfer"], dict):
                    transfer_id = data["transfer"].get("id") or data["transfer"].get("transfer_id")
                transfer_id = transfer_id or data.get("transfer_id") or data.get("id")
            if transfer_id:
                upsert_transfer_status(transfer_id, None, data)
        except Exception:
            pass

        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creando transferencia: {e}")
    except Exception as e: # type: ignore
        raise HTTPException(status_code=400, detail=f"Error creando transferencia: {e}")


@router.get("/transfer/get/{transfer_id}")
def transfer_get(transfer_id: str):
    client = plaid_client()
    try:
        req = TransferGetRequest(transfer_id=transfer_id)
        resp = client.transfer_get(req)
        try:
            return resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            return resp
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error consultando transferencia: {e}")


@router.post("/transfer/cancel/{transfer_id}")
def transfer_cancel(transfer_id: str):
    client = plaid_client()
    try:
        req = TransferCancelRequest(transfer_id=transfer_id)
        resp = client.transfer_cancel(req)
        try:
            return resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            return resp
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error cancelando transferencia: {e}")


@router.get("/transfers")
def transfers_list(count: int = 25, offset: int = 0):
    client = plaid_client()
    try:
        req = TransferListRequest(count=count, offset=offset)
        resp = client.transfer_list(req)
        try:
            return resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            return resp
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error listando transferencias: {e}")


@router.get("/transfer/events")
def transfer_events(count: int = 25, offset: int = 0):
    client = plaid_client()
    try:
        req = TransferEventListRequest(count=count, offset=offset)
        resp = client.transfer_event_list(req)
        try:
            return resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            return resp
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo eventos de transferencias: {e}")


@router.post("/transfer/reconcile/{transfer_id}")
def transfer_reconcile(transfer_id: str):
    """Consulta Plaid por el transfer_id y actualiza el estado en storage.

    Útil para tareas de reconciliación manual o automatizada.
    """
    client = plaid_client()
    try:
        req = TransferGetRequest(transfer_id=transfer_id)
        resp = client.transfer_get(req)
        try:
            data = resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            data = resp

        # Extraer status si está presente
        status_val = None
        if isinstance(data, dict):
            if "transfer" in data and isinstance(data["transfer"], dict):
                status_val = data["transfer"].get("status") or data["transfer"].get("current_status")
            else:
                status_val = data.get("status")

        # Actualizar storage local
        try:
            upsert_transfer_status(transfer_id, status_val, data)
        except Exception:
            pass

        return {"transfer_id": transfer_id, "status": status_val, "data": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reconciliando transferencia: {e}")
