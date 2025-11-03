from fastapi import APIRouter, Query, Response, HTTPException, Depends
from typing import Optional, List

from app.core.auth.guards import disallow_roles
from app.analytics.argus_analytics_schemas import (
    TodayChangeItem,
    SeriesResponse,
    ForwardCurveResponse,
)
from app.analytics.argus_analytics_service import (
    get_today_with_change,
    get_series,
    get_forward_curve,
    get_top_movers,
)


router = APIRouter(prefix="/argus-analytics", tags=["Argus Analytics"], dependencies=[Depends(disallow_roles("cliente"))])


@router.get("/today-with-change", response_model=List[TodayChangeItem])
def today_with_change(
    response: Response,
    date: Optional[str] = Query(None, description="YYYY-MM-DD en TZ del usuario; si no, hoy"),
    product_filter: Optional[str] = Query(None, description="Filtro por descripción (contiene)"),
    limit: int = Query(4000, ge=1, le=10000),
):
    try:
        data = get_today_with_change(date=date, product_filter=product_filter, limit=limit)
        response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=600"
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/series", response_model=SeriesResponse)
def series(
    response: Response,
    description: str = Query(...),
    delivery: Optional[str] = None,
    units: Optional[str] = None,
    unit_label: Optional[str] = None,
    currency: Optional[str] = None,
    repo_id: Optional[int] = None,
    forward_period: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    ma: Optional[str] = Query(None, description="Ventanas separadas por coma, ej: 7,30"),
    zscore: Optional[int] = Query(None, ge=2, le=120),
):
    try:
        out = get_series(
            description=description,
            delivery=delivery,
            units=units,
            unit_label=unit_label,
            currency=currency,
            repo_id=repo_id,
            forward_period=forward_period,
            date_from=date_from,
            date_to=date_to,
            ma=ma,
            zscore=zscore,
        )
        response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=600"
        return out
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/forward-curve", response_model=ForwardCurveResponse)
def forward_curve(
    response: Response,
    description: str = Query(...),
    on: Optional[str] = Query(None, description="YYYY-MM-DD; si no, último disponible"),
    delivery: Optional[str] = None,
):
    try:
        out = get_forward_curve(description=description, on=on, delivery=delivery)
        response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=1800"
        return out
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/top-movers", response_model=List[TodayChangeItem])
def top_movers(
    response: Response,
    date: Optional[str] = Query(None, description="YYYY-MM-DD en TZ del usuario; si no, hoy"),
    product_filter: Optional[str] = Query(None, description="Filtro por descripción (contiene)"),
    limit: int = Query(50, ge=1, le=500),
    metric: str = Query("pct", pattern="^(pct|abs)$"),
    direction: str = Query("down", pattern="^(up|down)$"),
):
    """Ranking de variaciones del día tomando la lista base de /today-with-change.

    metric=pct|abs para ordenar y filtrar por signo.
    direction=up devuelve sólo subidas, direction=down sólo caídas.
    """
    try:
        data = get_top_movers(
            date=date,
            product_filter=product_filter,
            limit=limit,
            metric=metric,
            direction=direction,
        )
        response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=600"
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
