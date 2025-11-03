try:
    from app.api.odoo_webhook_router import ExtensionCompatAdapter as AppSwitchMiddleware  # type: ignore
except Exception:
    from starlette.middleware.base import BaseHTTPMiddleware
    class AppSwitchMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            return await call_next(request)
