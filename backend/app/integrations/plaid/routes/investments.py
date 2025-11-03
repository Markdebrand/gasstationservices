from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..plaid_storage import latest_access_token
from .shared import plaid_client

try:
    from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
    from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest
except Exception:
    pass

from app.core.auth.session_manager import get_current_user
from app.db import models as db_models

router = APIRouter()


class HoldingsResponse(BaseModel):
    holdings: list


class InvestmentsTransactionsResponse(BaseModel):
    transactions: list


@router.get("/investments/holdings", response_model=HoldingsResponse)
def get_holdings(user: db_models.User = Depends(get_current_user)):
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    try:
        req = InvestmentsHoldingsGetRequest(access_token=token)
        resp = client.investments_holdings_get(req)
        try:
            data = resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            data = resp
        if isinstance(data, dict):
            holdings = data.get("holdings", [])
        else:
            try:
                holdings = resp["holdings"]  # type: ignore[index]
            except Exception:
                holdings = []
        return HoldingsResponse(holdings=holdings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo holdings: {e}")


@router.get("/investments/transactions", response_model=InvestmentsTransactionsResponse)
def get_investments_transactions(start: Optional[str] = None, end: Optional[str] = None, count: int = 50, offset: int = 0, user: db_models.User = Depends(get_current_user)):
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    try:
        kwargs = {"access_token": token}
        if start:
            kwargs["start_date"] = start
        if end:
            kwargs["end_date"] = end
        # Plaid SDK names may vary; use dynamic request creation where possible
        req = InvestmentsTransactionsGetRequest(**kwargs)  # type: ignore[arg-type]
        resp = client.investments_transactions_get(req)
        try:
            data = resp.to_dict()  # type: ignore[attr-defined]
        except Exception:
            data = resp
        if isinstance(data, dict):
            txs = data.get("investment_transactions", [])
        else:
            try:
                txs = resp["investment_transactions"]  # type: ignore[index]
            except Exception:
                txs = []
        return InvestmentsTransactionsResponse(transactions=txs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo investment transactions: {e}")
