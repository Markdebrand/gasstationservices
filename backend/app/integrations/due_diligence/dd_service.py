from __future__ import annotations

import json
from typing import Any, Dict
import httpx
import logging
from app.utils.metrics import Timer, increment

from app.config.settings import DUE_N8N_WEBHOOK_URL, DUE_N8N_TIMEOUT

logger = logging.getLogger("app.integrations.due")


def _normalize_result(obj: Any) -> Any:
    """Best-effort normalization of n8n responses.

    - If the response is a dict that only contains a 'data' or 'result' key, unwrap it.
    - Otherwise return as-is.
    """
    try:
        if isinstance(obj, dict):
            keys = list(obj.keys())
            if len(keys) == 1 and keys[0] in ("data", "result"):
                return obj[keys[0]]
    except Exception:
        pass
    return obj


def run_due_diligence(payload: Dict[str, Any]) -> Any:
    """Execute the Due Diligence workflow.

    Default implementation posts to an N8N webhook if configured.
    Returns the parsed JSON or text from the remote service.
    Fallbacks to echo the payload when no webhook is configured.
    """
    url = (DUE_N8N_WEBHOOK_URL or "").strip()
    if not url:
        # No external integration configured; return the payload for demo
        return {"echo": True, "input": payload}

    try:
        with httpx.Client(timeout=DUE_N8N_TIMEOUT) as client:
            # Force English responses from downstream workflow when supported
            headers = {
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
                # Some workflows may inspect custom or non-standard hints
                "X-Preferred-Language": "en",
            }
            with Timer("due.n8n.request"):
                res = client.post(url, json=payload, headers=headers)

            # Treat non-2xx as error and return structured info
            if res.status_code < 200 or res.status_code >= 300:
                body_text = (res.text or "").strip()
                # Try parse json even on errors
                err_payload: Any | None = None
                try:
                    if body_text:
                        err_payload = json.loads(body_text)
                except Exception:
                    err_payload = None
                try:
                    logger.warning(
                        "Due n8n non-2xx",
                        extra={
                            "status": res.status_code,
                            "content_type": res.headers.get("content-type", ""),
                            "body": body_text[:500],
                        },
                    )
                    increment("due.n8n.http_error", tags={"status": str(res.status_code)})
                except Exception:
                    pass
                return {
                    "error": f"n8n HTTP {res.status_code}",
                    "status": res.status_code,
                    "fallback": True,
                    "details": err_payload if isinstance(err_payload, dict) else {"body": body_text[:1000]},
                }

            ct = res.headers.get("content-type", "")
            if ct.startswith("application/json"):
                try:
                    return _normalize_result(res.json())
                except Exception as e:
                    # JSON claimed but invalid: fall back to text
                    body_text = (res.text or "").strip()
                    return {
                        "error": str(e),
                        "fallback": True,
                        "details": {"body": body_text[:1000]},
                    }

            # Try to parse text as JSON if it looks like it
            t = res.text.strip()
            if (t.startswith("{") and t.endswith("}")) or (t.startswith("[") and t.endswith("]")):
                try:
                    return _normalize_result(json.loads(t))
                except Exception:
                    pass
            return t
    except Exception as e:  # network/timeouts
        try:
            logger.warning("Due n8n request failed", extra={"error": str(e)})
            increment("due.n8n.error", tags={"kind": e.__class__.__name__})
        except Exception:
            pass
        return {"error": str(e), "fallback": True}


async def run_due_diligence_async(payload: Dict[str, Any]) -> Any:
    """Versión asíncrona usando httpx.AsyncClient.

    Mantiene la misma semántica que la versión síncrona.
    """
    url = (DUE_N8N_WEBHOOK_URL or "").strip()
    if not url:
        return {"echo": True, "input": payload}

    try:
        async with httpx.AsyncClient(timeout=DUE_N8N_TIMEOUT) as client:
            headers = {
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
                "X-Preferred-Language": "en",
            }
            with Timer("due.n8n.request"):
                res = await client.post(url, json=payload, headers=headers)

            if res.status_code < 200 or res.status_code >= 300:
                body_text = (res.text or "").strip()
                err_payload: Any | None = None
                try:
                    if body_text:
                        err_payload = json.loads(body_text)
                except Exception:
                    err_payload = None
                try:
                    logger.warning(
                        "Due n8n non-2xx",
                        extra={
                            "status": res.status_code,
                            "content_type": res.headers.get("content-type", ""),
                            "body": body_text[:500],
                        },
                    )
                    increment("due.n8n.http_error", tags={"status": str(res.status_code)})
                except Exception:
                    pass
                return {
                    "error": f"n8n HTTP {res.status_code}",
                    "status": res.status_code,
                    "fallback": True,
                    "details": err_payload if isinstance(err_payload, dict) else {"body": body_text[:1000]},
                }

            ct = res.headers.get("content-type", "")
            if ct.startswith("application/json"):
                try:
                    return _normalize_result(res.json())
                except Exception as e:
                    body_text = (res.text or "").strip()
                    return {
                        "error": str(e),
                        "fallback": True,
                        "details": {"body": body_text[:1000]},
                    }

            t = res.text.strip()
            if (t.startswith("{") and t.endswith("}")) or (t.startswith("[") and t.endswith("]")):
                try:
                    return _normalize_result(json.loads(t))
                except Exception:
                    pass
            return t
    except Exception as e:
        try:
            logger.warning("Due n8n request failed", extra={"error": str(e)})
            increment("due.n8n.error", tags={"kind": e.__class__.__name__})
        except Exception:
            pass
        return {"error": str(e), "fallback": True}
