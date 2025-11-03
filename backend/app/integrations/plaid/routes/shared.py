from fastapi import HTTPException
from app.config.settings import (
    PLAID_CLIENT_ID,
    PLAID_SECRET,
    PLAID_ENV,
)

try:
    from plaid import Configuration, ApiClient
    from plaid.api import plaid_api
except Exception:
    Configuration = None  # type: ignore[assignment]
    ApiClient = None  # type: ignore[assignment]
    plaid_api = None  # type: ignore[assignment]


def plaid_client():
    if not (PLAID_CLIENT_ID and PLAID_SECRET):
        raise HTTPException(status_code=500, detail="Plaid no configurado")
    if Configuration is None or ApiClient is None or plaid_api is None:
        raise HTTPException(status_code=500, detail="SDK de Plaid no instalado")
    env = PLAID_ENV.lower()
    base_map = {
        "sandbox": "https://sandbox.plaid.com",
        "development": "https://development.plaid.com",
        "production": "https://production.plaid.com",
    }
    configuration = Configuration(host=base_map.get(env, base_map["sandbox"]))
    configuration.api_key["clientId"] = PLAID_CLIENT_ID
    configuration.api_key["secret"] = PLAID_SECRET
    client = plaid_api.PlaidApi(ApiClient(configuration))
    return client
