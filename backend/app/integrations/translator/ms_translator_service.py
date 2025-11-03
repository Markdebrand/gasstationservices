from __future__ import annotations

import httpx
from typing import Any, Dict, List, Optional
from app.config.settings import (
    MS_TRANSLATOR_KEY,
    MS_TRANSLATOR_REGION,
    MS_TRANSLATOR_TEXT_ENDPOINT,
    MS_TRANSLATOR_RESOURCE_ENDPOINT,
)

class TranslatorError(RuntimeError):
    pass

def _headers_json() -> Dict[str, str]:
    if not MS_TRANSLATOR_KEY or not MS_TRANSLATOR_REGION:
        raise TranslatorError("Missing MS Translator credentials. Set MS_TRANSLATOR_KEY and MS_TRANSLATOR_REGION")
    return {
        "Ocp-Apim-Subscription-Key": MS_TRANSLATOR_KEY,
        "Ocp-Apim-Subscription-Region": MS_TRANSLATOR_REGION,
        "Content-Type": "application/json",
    }

async def translate_text(texts: List[str], to: str, source: Optional[str] = None, category: Optional[str] = None, text_type: Optional[str] = None) -> List[str]:
    base = MS_TRANSLATOR_TEXT_ENDPOINT.rstrip('/')
    url = f"{base}/translate?api-version=3.0&to={to}"
    if source:
        url += f"&from={source}"
    if category:
        url += f"&category={category}"
    if text_type and text_type.lower() == 'html':
        url += "&textType=html"
    body = [{"text": t} for t in texts]
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, headers=_headers_json(), json=body)
        if r.status_code >= 400:
            raise TranslatorError(f"Translate error {r.status_code}: {r.text}")
        data = r.json()
        out: List[str] = []
        for item in data:
            trans = item.get("translations") or []
            if not trans:
                out.append("")
            else:
                out.append(trans[0].get("text", ""))
        return out

# Basic document translation kick-off (async operation). Client can poll status URL.
async def translate_document_start(file_bytes: bytes, filename: str, to: str, source: Optional[str] = None) -> str:
    """Starts an async document translation job and returns operation-location URL.

    Requires MS_TRANSLATOR_RESOURCE_ENDPOINT set to the resource base, e.g., https://<name>.cognitiveservices.azure.com/
    """
    base = (MS_TRANSLATOR_RESOURCE_ENDPOINT or "").rstrip('/')
    if not base:
        raise TranslatorError("MS_TRANSLATOR_RESOURCE_ENDPOINT is required for document translation")
    url = f"{base}/translator/text/batch/v1.1/documents:translate?api-version=2024-05-01"
    headers = {
        "Ocp-Apim-Subscription-Key": MS_TRANSLATOR_KEY or "",
        "Ocp-Apim-Subscription-Region": MS_TRANSLATOR_REGION or "",
        # For document batch, content-type is multipart/form-data; however for simplicity we send JSON manifest for single doc
        "Content-Type": "application/json",
    }
    # Minimal single-document manifest using inline document content (base64) is not supported; typically you use SAS URLs.
    # Here we raise to signal this needs storage integration (SAS) in a real implementation.
    raise TranslatorError("Document translation requires Azure Storage with SAS URLs; integrate storage to proceed.")
