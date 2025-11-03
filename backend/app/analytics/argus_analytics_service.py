"""Servicios de analytics para Argus.

No tocan los conectores de Odoo/Argus: se apoyan en app.integrations.argus.argus_service
para traer datos y construir respuestas "chart-ready".
"""
from __future__ import annotations

from typing import Optional, Dict, Tuple, List
from datetime import datetime, timedelta

from app.analytics.argus_analytics_schemas import (
    TodayChangeItem,
    SeriesPoint,
    SeriesMeta,
    SeriesResponse,
    ForwardCurvePoint,
    ForwardCurveResponse,
)
from app.integrations.argus.argus_service import get_argus_prices
from app.utils.adapters.cache_adapter import get_cache, set_cache
from app.config.settings import CACHE_TTL_ARGUS_PRICES as DEFAULT_TTL


def _yyyymmdd(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def _to_float(v) -> Optional[float]:
    if v in (None, "", "-"):
        return None
    try:
        return float(v)
    except Exception:
        return None


def _series_key(row: dict) -> Tuple:
    return (
        row.get("description") or row.get("product_description") or "",
        row.get("deliveryMode") or row.get("delivery_mode_label") or "",
        row.get("units") or row.get("units_display") or "",
        row.get("unitLabel") or row.get("unit2_label") or "",
        row.get("currency") or "",
        row.get("repoId") or row.get("repository_id"),
        row.get("forwardPeriod") or row.get("forward_period") or "",
    )


def _dedupe_last_of_day(rows: List[dict]) -> Dict[Tuple, dict]:
    """Para cada clave de serie, quedarse con el último registro del día (por publishedAt)."""
    out: Dict[Tuple, dict] = {}
    for r in rows:
        k = _series_key(r)
        prev = out.get(k)
        if not prev:
            out[k] = r
            continue
        if (r.get("publishedAt") or "") > (prev.get("publishedAt") or ""):
            out[k] = r
    return out


def get_today_with_change(
    *,
    date: Optional[str] = None,
    product_filter: Optional[str] = None,
    limit: int = 4000,
) -> List[TodayChangeItem]:
    """Devuelve sólo los registros del día `date` y añade cambio vs el último previo.

    No requiere DB adicional; usa 1–2 lecturas del servicio Argus.
    """
    # Cache key
    ckey = f"argus:analytics:today-change:date={date or 'auto'}:pf={product_filter or ''}:l={limit}"
    cached = get_cache(ckey)
    if cached is not None:
        return cached

    # Determinar ventana de fechas
    today = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now()
    today_str = _yyyymmdd(today)
    # Ventana previa de hasta 7 días para encontrar el último previo
    prev_from = _yyyymmdd(today - timedelta(days=7))
    prev_to = _yyyymmdd(today - timedelta(days=1))

    # 1) Traer HOY
    page_today = get_argus_prices(
        limit=limit,
        offset=0,
        order="publication_date desc",
        product_description=product_filter,
        date_from=today_str,
        date_to=today_str,
        with_total=False,
        shape="compact",
    )
    today_rows = page_today.records_compact or []

    # 2) Traer ventana PREVIA
    page_prev = get_argus_prices(
        limit=limit * 3,  # un poco más amplio
        offset=0,
        order="publication_date desc",
        product_description=product_filter,
        date_from=prev_from,
        date_to=prev_to,
        with_total=False,
        shape="compact",
    )
    prev_rows = page_prev.records_compact or []

    # Deduplicar por clave: último de cada día ya que filtramos por fecha exacta
    today_by_key = _dedupe_last_of_day(today_rows)

    # Para prev: basta con el primero con fecha < hoy (ya vienen desc)
    prev_by_key: Dict[Tuple, dict] = {}
    for r in prev_rows:
        if (r.get("publishedAt") or "") >= today_str:
            continue
        k = _series_key(r)
        if k not in prev_by_key:
            prev_by_key[k] = r

    result: List[TodayChangeItem] = []
    for k, t in today_by_key.items():
        last = _to_float(t.get("value"))
        p = prev_by_key.get(k)
        prev = _to_float(p.get("value")) if p else None
        abs_change = pct_change = None
        direction = "flat"
        if last is not None and prev is not None and prev != 0:
            abs_change = last - prev
            pct_change = (abs_change / prev) * 100.0
            direction = "up" if abs_change > 0 else ("down" if abs_change < 0 else "flat")

        result.append(
            TodayChangeItem(
                description=t.get("description") or "",
                deliveryMode=t.get("deliveryMode"),
                units=t.get("units"),
                unitLabel=t.get("unitLabel"),
                currency=t.get("currency"),
                repoId=t.get("repoId"),
                forwardPeriod=t.get("forwardPeriod"),
                lastDate=str(t.get("publishedAt") or ""),
                lastPrice=last,
                prevDate=str(p.get("publishedAt")) if p and p.get("publishedAt") else None,
                prevPrice=prev,
                absChange=abs_change,
                pctChange=pct_change,
                direction=direction,
            )
        )

    # Cachear
    set_cache(ckey, result, ttl_seconds=DEFAULT_TTL)
    return result


def _rolling_ma(values: List[Optional[float]], window: int) -> List[Optional[float]]:
    out: List[Optional[float]] = []
    acc: List[float] = []
    for v in values:
        if v is None:
            acc.append(float("nan"))
        else:
            acc.append(v)
        if len(acc) > window:
            acc.pop(0)
        sub = [x for x in acc if x == x]  # remove NaN
        out.append(sum(sub) / len(sub) if sub else None)
    return out


def _rolling_std(values: List[Optional[float]], window: int) -> List[Optional[float]]:
    import math
    out: List[Optional[float]] = []
    acc: List[float] = []
    for v in values:
        acc.append(v if v is not None else float("nan"))
        if len(acc) > window:
            acc.pop(0)
        sub = [x for x in acc if x == x]
        if not sub:
            out.append(None)
            continue
        mean = sum(sub) / len(sub)
        var = sum((x - mean) ** 2 for x in sub) / len(sub)
        out.append(math.sqrt(var))
    return out


def get_series(
    *,
    description: str,
    delivery: Optional[str] = None,
    units: Optional[str] = None,
    unit_label: Optional[str] = None,
    currency: Optional[str] = None,
    repo_id: Optional[int] = None,
    forward_period: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    ma: Optional[str] = None,  # "7,30"
    zscore: Optional[int] = None,
) -> SeriesResponse:
    """Construye serie diaria (último por día) y métricas básicas.
    Filtra por meta para no mezclar series diferentes.
    """
    # Cache key
    parts = [
        f"d={description}", f"del={delivery or ''}", f"u={units or ''}", f"ul={unit_label or ''}",
        f"cur={currency or ''}", f"r={repo_id or ''}", f"fp={forward_period or ''}",
        f"df={date_from or ''}", f"dt={date_to or ''}", f"ma={ma or ''}", f"zs={zscore or ''}",
    ]
    ckey = "argus:analytics:series:" + "|".join(parts)
    cached = get_cache(ckey)
    if cached is not None:
        return cached

    page = get_argus_prices(
        limit=4000,
        offset=0,
        order="publication_date desc",
        product_description=description,
        date_from=date_from,
        date_to=date_to,
        with_total=False,
        shape="compact",
    )
    rows = page.records_compact or []

    # Filtrar por meta exacta cuando se proporcionan
    def _match(r: dict) -> bool:
        return (
            (delivery is None or r.get("deliveryMode") == delivery)
            and (units is None or r.get("units") == units)
            and (unit_label is None or r.get("unitLabel") == unit_label)
            and (currency is None or r.get("currency") == currency)
            and (repo_id is None or r.get("repoId") == repo_id)
            and (forward_period is None or r.get("forwardPeriod") == forward_period)
        )

    rows = [r for r in rows if _match(r)]

    # Orden ascendente por fecha y deduplicación (último del día)
    rows.sort(key=lambda r: r.get("publishedAt") or "")

    # Compactar a un punto por día
    by_day: Dict[str, dict] = {}
    for r in rows:
        day = (r.get("publishedAt") or "")[:10]
        prev = by_day.get(day)
        if not prev or (r.get("publishedAt") or "") > (prev.get("publishedAt") or ""):
            by_day[day] = r

    days_sorted = sorted(by_day.keys())
    points: List[SeriesPoint] = []
    values: List[Optional[float]] = []
    for d in days_sorted:
        rr = by_day[d]
        v = _to_float(rr.get("value"))
        if v is None:
            continue
        points.append(SeriesPoint(t=str(rr.get("publishedAt") or d), p=v))
        values.append(v)

    ma7 = ma30 = z20 = None
    if ma:
        try:
            wins = [int(x) for x in str(ma).split(",") if x]
        except Exception:
            wins = []
        if 7 in wins:
            ma7 = _rolling_ma(values, 7)
        if 30 in wins:
            ma30 = _rolling_ma(values, 30)
    if zscore:
        stds = _rolling_std(values, zscore)
        means = _rolling_ma(values, zscore)
        z20 = [((v - m) / s) if v is not None and m is not None and s not in (None, 0) else None for v, m, s in zip(values, means, stds)]

    meta = SeriesMeta(
        description=description,
        deliveryMode=delivery,
        units=units,
        unitLabel=unit_label,
        currency=currency,
        repoId=repo_id,
        forwardPeriod=forward_period,
    )
    # Filter None inside MA arrays to satisfy List[float] typing (or drop arrays if all None)
    def _clean(seq):
        if seq is None:
            return None
        cleaned = [x for x in seq if x is not None]
        return cleaned if cleaned else None

    out = SeriesResponse(
        points=points,
        ma7=_clean(ma7),
        ma30=_clean(ma30),
        z20=_clean(z20),
        meta=meta,
    )
    set_cache(ckey, out, ttl_seconds=DEFAULT_TTL)
    return out


def get_forward_curve(
    *,
    description: str,
    on: Optional[str] = None,
    delivery: Optional[str] = None,
) -> ForwardCurveResponse:
    """Construye la curva a plazo del último snapshot de la fecha `on` (o la más reciente)."""
    # Cache key
    ckey = f"argus:analytics:fwdcurve:d={description}:on={on or 'latest'}:del={delivery or ''}"
    cached = get_cache(ckey)
    if cached is not None:
        return cached

    # Traer ventana que cubra la fecha
    if on:
        df = dt = on
    else:
        # Últimos 3 días para capturar lo más reciente
        now = datetime.now()
        df = _yyyymmdd(now - timedelta(days=3))
        dt = _yyyymmdd(now)

    page = get_argus_prices(
        limit=4000,
        offset=0,
        order="publication_date desc",
        product_description=description,
        date_from=df,
        date_to=dt,
        with_total=False,
        shape="compact",
    )
    rows = page.records_compact or []
    if delivery:
        rows = [r for r in rows if (r.get("deliveryMode") or "") == delivery]

    # Quedarse con el último snapshot (máximo publishedAt)
    rows.sort(key=lambda r: r.get("publishedAt") or "")
    latest_day = (rows[-1]["publishedAt"])[:10] if rows else (on or _yyyymmdd(datetime.now()))
    day_rows = [r for r in rows if (r.get("publishedAt") or "").startswith(latest_day)]

    # Mapear a {forwardPeriod -> precio}
    def _fp_key(s: str | None) -> Tuple[int, str]:
        if not s:
            return (0, "")
        try:
            if s.upper().startswith("M"):
                return (int(s[1:]), s)
        except Exception:
            pass
        return (9999, s)

    by_fp: Dict[str, float] = {}
    for r in day_rows:
        fp = r.get("forwardPeriod") or ""
        v = _to_float(r.get("value"))
        if v is None:
            continue
        by_fp[fp] = v

    ordered = sorted(by_fp.items(), key=lambda kv: _fp_key(kv[0]))
    pts = [ForwardCurvePoint(month=k or "SPOT", price=v) for k, v in ordered]

    # Slopes sencillos
    def get_val(tag: str) -> Optional[float]:
        return by_fp.get(tag)

    m1 = get_val("M1")
    m3 = get_val("M3")
    m6 = get_val("M6")
    slopes = {
        "M3-M1": (m3 - m1) if (m3 is not None and m1 is not None) else None,
        "M6-M3": (m6 - m3) if (m6 is not None and m3 is not None) else None,
    }

    out = ForwardCurveResponse(on=latest_day, points=pts, slopes=slopes)
    set_cache(ckey, out, ttl_seconds=DEFAULT_TTL)
    return out


def get_top_movers(
    *,
    date: Optional[str] = None,
    product_filter: Optional[str] = None,
    limit: int = 50,
    metric: str = "pct",  # pct | abs
    direction: str = "down",  # up | down (down = mayores caídas)
) -> List[TodayChangeItem]:
    """Ranking de variaciones del día derivado de get_today_with_change.

    metric=pct|abs define el campo sobre el que se ordena.
    direction=up muestra sólo subidas; direction=down sólo caídas.
    Siempre se ordena por la magnitud del cambio (absoluto) descendente dentro del filtro.
    """
    metric = metric if metric in ("pct", "abs") else "pct"
    direction = direction if direction in ("up", "down") else "down"

    ckey = (
        "argus:analytics:top-movers:"  # cache key
        f"d={date or 'auto'}|pf={product_filter or ''}|l={limit}|m={metric}|dir={direction}"
    )
    cached = get_cache(ckey)
    if cached is not None:
        return cached

    base = get_today_with_change(date=date, product_filter=product_filter, limit=4000)

    def _value(item: TodayChangeItem) -> float:
        if metric == "pct":
            return item.pctChange or 0.0
        return item.absChange or 0.0

    if direction == "up":
        filtered = [it for it in base if (_value(it) > 0)]
    else:  # down
        filtered = [it for it in base if (_value(it) < 0)]

    # Ordenar por magnitud absoluta (más movimiento primero)
    ordered = sorted(
        filtered,
        key=lambda it: (abs(_value(it)), it.description or ""),
        reverse=True,
    )
    out = ordered[:limit]
    set_cache(ckey, out, ttl_seconds=DEFAULT_TTL)
    return out
