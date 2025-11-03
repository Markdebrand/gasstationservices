from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

from ..plaid_storage import latest_access_token
from .shared import plaid_client

try:
    from plaid.model.transactions_get_request import TransactionsGetRequest
    from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
except Exception:
    pass

from app.core.auth.session_manager import get_current_user
from app.db import models as db_models


router = APIRouter()


class TransactionsResponse(BaseModel):
    transactions: list
    total: int


@router.get("/transactions", response_model=TransactionsResponse)
def get_transactions(start: Optional[str] = None, end: Optional[str] = None, count: int = 50, offset: int = 0, user: db_models.User = Depends(get_current_user)):
    user_id = str(user.id)
    token = latest_access_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No hay access_token registrado para usuario")
    client = plaid_client()
    try:
        end_date = date.fromisoformat(end) if end else date.today()
        start_date = date.fromisoformat(start) if start else (end_date - timedelta(days=30))
        options = TransactionsGetRequestOptions(count=count, offset=offset)
        req = TransactionsGetRequest(access_token=token, start_date=start_date, end_date=end_date, options=options)
        resp = client.transactions_get(req)
        return TransactionsResponse(transactions=resp["transactions"], total=resp["total_transactions"])  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error obteniendo transacciones: {e}")
