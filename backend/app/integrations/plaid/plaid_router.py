from fastapi import APIRouter, Depends
from app.core.auth.guards import disallow_roles, require_cliente

from .routes.core import router as core_router
from .routes.transactions import router as transactions_router
from .routes.identity import router as identity_router
from .routes.transfers import router as transfers_router
from .routes.webhook import router as webhook_router
from .routes.investments import router as investments_router
from .routes.identity_verification import router as idv_router
from fastapi import Depends, HTTPException
from app.core.auth.session_manager import get_current_user
from app.db.database import SessionLocal
from app.db.models import PlaidIdentityVerification, User as DbUser


def require_idv_verified(user: DbUser = Depends(get_current_user)):
	"""Dependencia opcional para endpoints que requieran IDV aprobado.

	Estados considerados 'aprobado': approved, completed, success, succeeded.
	"""
	approved_states = {"approved", "completed", "success", "succeeded"}
	with SessionLocal() as db:
		row = (
			db.query(PlaidIdentityVerification)
			.filter(PlaidIdentityVerification.user_id == user.id)
			.order_by(PlaidIdentityVerification.id.desc())
			.first()
		)
		if not row or (row.status or "").lower() not in approved_states:
			raise HTTPException(status_code=403, detail="Identity verification requerida")
	return user


router = APIRouter(prefix="/plaid", tags=["plaid"])

# Core: link token, exchange, accounts, debug-config
router.include_router(core_router)

# Transactions (bloqueado para 'cliente')
router.include_router(transactions_router, dependencies=[Depends(disallow_roles("cliente"))])

# Identity
router.include_router(identity_router)

# Identity Verification (IDV)
router.include_router(idv_router)

# Transfers (bloqueado para 'cliente')
router.include_router(transfers_router, dependencies=[Depends(disallow_roles("cliente"))])

# Investments (bloqueado para 'cliente')
router.include_router(investments_router, dependencies=[Depends(disallow_roles("cliente"))])

# Webhook (sin auth, validación a nivel de módulo)
router.include_router(webhook_router)
