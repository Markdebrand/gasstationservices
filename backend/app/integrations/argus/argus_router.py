from fastapi import APIRouter, HTTPException, Query, Response, Depends
from typing import Optional, List
from .argus_schemas import ArgusPricePage, ArgusNewsDetail, ArgusNewsListItem
from .argus_service import (
    get_argus_prices, get_argus_product_descriptions,
    get_argus_news_list, get_argus_news_detail,
    audit_argus_prices_integrity,
    get_argus_prices_count,
    get_argus_prices_summary,
)
from .argus_service import bulk_history_by_products
from .argus_service import get_argus_prices_today
from .argus_service import get_argus_product_search
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.core.auth.guards import disallow_roles

router = APIRouter(prefix="/argus", tags=["Argus"], dependencies=[Depends(disallow_roles("cliente"))])


@router.get("/prices", response_model=ArgusPricePage)
def prices(
    response: Response,
    limit: int = Query(80, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    order: str = "publication_date desc",
    product_description: Optional[List[str]] = Query(None, description="product_description exact match; puede repetirse para varios productos"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    with_total: bool = Query(False, description="Si true, calcula el total (requiere llamada extra)"),
    shape: Optional[str] = Query(None, pattern="^(compact)$", description="Shape alternativo de salida (compact)"),
    cursor_id: Optional[int] = Query(None, description="Paginación por cursor (id). Si order=id desc, usa id<cursor."),
    date_pref: str = Query("publication", pattern="^(publication|fmt)$", description="Preferencia de campo fecha para shape=compact"),
    q: Optional[str] = Query(None, description="Búsqueda de texto en product_description/tag (ilike)"),
):
    try:
        page = get_argus_prices(limit=limit, offset=offset, order=order, product_description=product_description, date_from=date_from, date_to=date_to, with_total=with_total, shape=shape, cursor_id=cursor_id, date_pref=date_pref, q=q)
        response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
        return page
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/prices/products", response_model=list[str])
def price_products(response: Response):
    try:
        data = get_argus_product_descriptions()
        response.headers["Cache-Control"] = "public, max-age=3600"
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))



@router.get("/products/search", response_model=list[str])
def products_search(response: Response, q: Optional[str] = Query(None, description="texto para buscar products (ilike)"), limit: int = Query(50, ge=1, le=1000)):
    try:
        data = get_argus_product_search(q=q, limit=limit)
        response.headers["Cache-Control"] = "public, max-age=300"
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/news", response_model=list[ArgusNewsListItem])
def news_list(
    response: Response,
    limit: int = Query(80, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    order: str = "id desc",
    fields: Optional[List[str]] = Query(None, description="Campos a devolver en la lista (opcional)"),
    cursor_id: Optional[int] = Query(None, description="Paginación por cursor (id). Si order=id desc, usa id<cursor."),
):
    try:
        data = get_argus_news_list(limit, offset, order, fields, cursor_id=cursor_id)
        response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=600"
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/news/{news_odoo_id}", response_model=ArgusNewsDetail)
def news_detail(response: Response, news_odoo_id: int):
    try:
        out = get_argus_news_detail(news_odoo_id)
        if not out:
            raise HTTPException(status_code=404, detail="News not found")
        response.headers["Cache-Control"] = "public, max-age=600"
        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/prices/audit", summary="Audita integridad de argus.price enumerando todas las filas")
def prices_audit(response: Response, page_size: int = Query(2000, ge=100, le=5000)):
    """Recorre argus.price por id asc para verificar que podemos obtener todas las filas.

    Devuelve contadores y max_id para detectar nuevos registros.
    Resultado se cachea unos minutos para evitar sobrecarga.
    """
    try:
        data = audit_argus_prices_integrity(page_size=page_size)
        # Cache corto lado cliente (sólo métricas, no datos sensibles)
        response.headers["Cache-Control"] = "public, max-age=60"
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))



@router.get("/prices/today", response_model=ArgusPricePage)
def prices_today(
    response: Response,
    limit: int = Query(80, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    order: str = "publication_date desc",
    product_description: Optional[List[str]] = Query(None, description="product_description exact match; puede repetirse para varios productos"),
    with_total: bool = Query(False, description="Si true, calcula el total (requiere llamada extra)"),
    shape: Optional[str] = Query("compact", pattern="^(compact)$", description="Shape alternativo de salida (compact)"),
    cursor_id: Optional[int] = Query(None, description="Paginación por cursor (id). Si order=id desc, usa id<cursor."),
    date_pref: str = Query("publication", pattern="^(publication|fmt)$", description="Preferencia de campo fecha para shape=compact"),
    q: Optional[str] = Query(None, description="Búsqueda de texto en product_description/tag (ilike)"),
):
    try:
        page = get_argus_prices_today(limit=limit, offset=offset, order=order, product_description=product_description, with_total=with_total, shape=shape, cursor_id=cursor_id, date_pref=date_pref, q=q)
        response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
        return page
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/prices/count")
def prices_count(
    product_description: Optional[List[str]] = Query(None, description="product_description exact match; puede repetirse para varios productos"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = Query(None, description="Búsqueda de texto en product_description/tag (ilike)"),
):
    try:
        total = get_argus_prices_count(product_description=product_description, date_from=date_from, date_to=date_to, q=q)
        return {"total": int(total)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/prices/summary")
async def prices_summary(
    response: Response,
    group_by: str = Query("month", pattern="^(month|product|month_product)$"),
    product_description: Optional[List[str]] = Query(None, description="product_description exact match; puede repetirse para varios productos"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    date_pref: str = Query("publication", pattern="^(publication|fmt)$"),
    q: Optional[str] = Query(None, description="Búsqueda de texto en product_description/tag (ilike)"),
):
    try:
        data = await run_in_threadpool(get_argus_prices_summary, group_by, product_description, date_from, date_to, date_pref, q)
        response.headers["Cache-Control"] = "public, max-age=900"
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


class BulkHistoryRequest(BaseModel):
    products: List[str]
    limit_per_product: int = 2
    date_from: Optional[str] = None
    date_to: Optional[str] = None


@router.post("/prices/bulk_history")
async def prices_bulk_history(req: BulkHistoryRequest):
    try:
        # Ejecutar en threadpool porque llama a Odoo (bloqueante)
        data = await run_in_threadpool(lambda: bulk_history_by_products(products=req.products, limit_per_product=req.limit_per_product, date_from=req.date_from, date_to=req.date_to))
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
