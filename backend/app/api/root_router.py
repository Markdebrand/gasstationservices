from fastapi import APIRouter

# Agregador central de routers de la aplicación
# Mantiene los mismos prefijos que cada módulo declara (no se añade prefix global)

router = APIRouter()

# Integrations
from app.integrations.argus.argus_router import router as argus_router  # /argus
from app.integrations.plaid.plaid_router import router as plaid_router  # /plaid
from app.analytics.argus_analytics_router import router as argus_analytics_router  # /argus-analytics

# Auth
from app.auth.auth_router import router as auth_router  # /auth

from app.auth.providers.google import router as google_router  # /auth/google

# System routes (healthz, root, google_authorized)
from app.api.system_router import router as system_router
from app.rpc.rpc_server import router as rpc_router
from app.api.contact_router import router as contact_router
from app.api.contact_form_router import router as contact_form_router  # /contact-us
from app.api.activation_router import router as activation_router  # /auth/activation
from app.api.odoo_webhook_router import router as odoo_webhook_router  # /odoo (webhooks)
from app.integrations.odoo.odoo_router import router as odoo_integration_router  # /odoo (API proxy)

# Incluir routers en el agregador
router.include_router(argus_router)
router.include_router(argus_analytics_router)
router.include_router(plaid_router)
router.include_router(auth_router)
router.include_router(google_router)
router.include_router(system_router)
router.include_router(rpc_router)
router.include_router(contact_router)
router.include_router(contact_form_router)
router.include_router(activation_router)
router.include_router(odoo_webhook_router)
router.include_router(odoo_integration_router)

# Due Diligence (integrations module)
from app.integrations.due_diligence.dd_router import router as due_router
router.include_router(due_router)

# Microsoft Translator
from app.integrations.translator.translator_router import router as translate_router
router.include_router(translate_router)

# Support form (SMTP)
from app.api.support_router import router as support_router
router.include_router(support_router)

# Release / Changelog
from app.api.release_router import router as release_router
router.include_router(release_router)

# User Preferences
from app.api.preferences_router import router as preferences_router
router.include_router(preferences_router)

# Sharing (invitaciones Plaid)
from app.api.sharing_router import router as sharing_router
router.include_router(sharing_router)
