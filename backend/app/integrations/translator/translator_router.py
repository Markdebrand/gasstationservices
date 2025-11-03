from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth.guards import disallow_roles
from pydantic import BaseModel
from app.db import models as m
from .ms_translator_service import translate_text, TranslatorError

router = APIRouter(prefix="/translate", tags=["Translate"], dependencies=[Depends(disallow_roles("cliente"))])

class TranslateTextIn(BaseModel):
    texts: List[str]
    to: str
    source: Optional[str] = None
    category: Optional[str] = None
    text_type: Optional[str] = None  # 'plain' | 'html'

class TranslateTextOut(BaseModel):
    translations: List[str]

@router.post("/text", response_model=TranslateTextOut)
async def translate_text_api(body: TranslateTextIn):
    try:
        out = await translate_text(body.texts, to=body.to, source=body.source, category=body.category, text_type=body.text_type)
        return {"translations": out}
    except TranslatorError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translator failure: {e}")

class TranslateDocOut(BaseModel):
    detail: str

@router.post("/document", response_model=TranslateDocOut, status_code=501)
async def translate_document_api():
    """Placeholder for document translation.
    Azure Document Translation requires Azure Storage SAS URLs for input/output containers.
    Integrate storage and provide SAS to enable this.
    """
    return {"detail": "Document translation not configured. Requires Azure Storage SAS URLs."}
