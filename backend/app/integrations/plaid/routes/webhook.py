from fastapi import APIRouter, HTTPException, Request
import hmac
import hashlib
from typing import Optional

from app.config.settings import PLAID_WEBHOOK_SIGNING_KEY, PLAID_WEBHOOK_FORWARD_URL
import httpx # type: ignore
from ..plaid_storage import upsert_transfer_status, insert_transfer_event
from app.db.database import SessionLocal
from app.db.models import PlaidIdentityVerification
import json

router = APIRouter()


def _verify_plaid_signature(secret: Optional[str], body_bytes: bytes, header_sig: Optional[str]) -> bool:
    """Verifica HMAC SHA256 usando PLAID_WEBHOOK_SIGNING_KEY.

    Plaid may send signature in header 'Plaid-Verification' or 'X-Plaid-Signature'.
    """
    if not secret:
        # No secret configured; treat as not-verified (fail safe)
        return False
    if not header_sig:
        return False
    try:
        sig = hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()
        # header may include prefix or multiple signatures; compare presence
        return hmac.compare_digest(sig, header_sig) or header_sig.endswith(sig)
    except Exception:
        return False


@router.post("/webhook")
async def plaid_webhook(request: Request):
    """Recibe webhooks de Plaid. Maneja eventos de transfer y registra payloads.

    Validación: comprueba HMAC usando PLAID_WEBHOOK_SIGNING_KEY y header Plaid-Verification/X-Plaid-Signature.
    """
    body_bytes = await request.body()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Extract signature header
    header_sig = request.headers.get("Plaid-Verification") or request.headers.get("X-Plaid-Signature")
    if not _verify_plaid_signature(PLAID_WEBHOOK_SIGNING_KEY, body_bytes, header_sig):
        # Log could be added; reject unauthenticated webhooks
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    webhook_type = body.get("webhook_type")
    webhook_code = body.get("webhook_code")
    transfer_id = body.get("transfer_id") or (body.get("transfer") or {}).get("id")
    event_type = body.get("event_type")

    # Persistir evento bruto (sólo para transfer de momento)
    if webhook_type == "TRANSFER":
        try:
            insert_transfer_event(transfer_id, event_type, webhook_type, webhook_code, body)
        except Exception:
            pass

    # Actualizar estado si aplica
    status_map_fields = ["status", "transfer_status", "current_status"]
    status_val = None
    for f in status_map_fields:
        if f in body:
            status_val = body[f]
            break
        if isinstance(body.get("transfer"), dict) and f in body["transfer"]:
            status_val = body["transfer"][f]
            break
    if webhook_type == "TRANSFER" and transfer_id:
        try:
            upsert_transfer_status(transfer_id, status_val, body)
        except Exception:
            pass

    # Identity Verification webhook handling
    if webhook_type == "IDENTITY_VERIFICATION":
        idv_id = body.get("identity_verification_id") or body.get("id")
        idv_status = body.get("status")
        failure_reasons = body.get("failure_reasons") or []
        failure_reason_text = None
        if isinstance(failure_reasons, list) and failure_reasons:
            # Plaid returns objects with fields like "reason" / "code" / "description"
            try:
                failure_reason_text = "; ".join(
                    [
                        f"{fr.get('code') or fr.get('reason')}: {fr.get('description') or fr.get('message') or ''}".strip()
                        for fr in failure_reasons if isinstance(fr, dict)
                    ]
                )[:500]
            except Exception:
                failure_reason_text = None
        if idv_id:
            try:
                with SessionLocal() as db:
                    row = (
                        db.query(PlaidIdentityVerification)
                        .filter(PlaidIdentityVerification.plaid_session_id == idv_id)
                        .first()
                    )
                    payload_str = None
                    try:
                        payload_str = json.dumps(body)[:3900]
                    except Exception:
                        pass
                    if row:
                        if idv_status:
                            setattr(row, "status", idv_status)
                        if failure_reason_text:
                            setattr(row, "failed_reason", failure_reason_text)
                        if payload_str is not None:
                            setattr(row, "last_payload", payload_str)
                        # marcar approved_at si estado final aprobado
                        if idv_status and idv_status.lower() in {"approved", "completed", "success", "succeeded"}:
                            # Sólo setear si está vacío (no comparar booleanamente la columna, usar getattr)
                            current_val = getattr(row, "approved_at")
                            if current_val is None:
                                from datetime import datetime, timezone
                                setattr(row, "approved_at", datetime.now(timezone.utc))
                        db.commit()
            except Exception:
                # no bloquear otros webhooks
                pass
    # Reenvío opcional a servicio externo si está configurado
    try:
        if PLAID_WEBHOOK_FORWARD_URL:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # reenviamos body tal cual y mantenemos cabeceras mínimas
                await client.post(PLAID_WEBHOOK_FORWARD_URL, json=body, headers={"X-Forwarded-From": "plaid-webhook"})
    except Exception:
        # No bloquear el flujo por fallos en el forward
        pass

    return {"ok": True}
