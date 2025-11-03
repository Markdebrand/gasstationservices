from typing import Optional, List, Dict, Any, Union
import threading
from time import time
from app.integrations.argus.argus_connector import ArgusConnector
from .argus_schemas import ArgusPrice, ArgusPricePage, ArgusNewsListItem, ArgusNewsDetail
from app.integrations.argus.argus_normalizers import (
    normalize_argus_price_row,
    collapse_price_row,
    normalize_argus_news_list_row,
    normalize_argus_news_detail_row,
)
from app.utils.adapters.cache_adapter import get_cache, set_cache
from app.config.settings import (
    CACHE_TTL_ARGUS_NEWS_LIST,
    CACHE_TTL_ARGUS_NEWS_DETAIL,
    CACHE_TTL_ARGUS_PRODUCTS,
    CACHE_TTL_ARGUS_PRICES,
)
from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

_connector: ArgusConnector | None = None
_locks: dict[str, threading.Lock] = {}

def _get_lock(key: str) -> threading.Lock:
    # Lock por clave para evitar stampedes de caché
    lock = _locks.get(key)
    if lock is None:
        lock = threading.Lock()
        _locks[key] = lock
    return lock

def _cache_put_with_backup(key: str, value, ttl: int, backup_ttl: int = 24*3600) -> None:
    """Guarda en caché principal y una copia de respaldo con TTL largo.
    Así podemos servir datos 'stale' si Odoo falla temporalmente.
    """
    set_cache(key, value, ttl_seconds=ttl)
    set_cache(f"{key}:backup", value, ttl_seconds=backup_ttl)

def _cache_get_with_backup(key: str):
    val = get_cache(key)
    if val is not None:
        return val
    return get_cache(f"{key}:backup")

def _get_connector() -> ArgusConnector:
    global _connector
    if _connector is None:
        _connector = ArgusConnector()
    return _connector


# --- Helpers ---
_ALLOWED_PRICE_ORDER = {"publication_date", "id"}
_ALLOWED_NEWS_ORDER = {"id", "publication_date"}

def _safe_order(order: str, allowed: set[str], default: str) -> str:
    try:
        field, _, direction = (order or "").partition(" ")
        field = (field or "").strip()
        direction = (direction or "desc").strip().lower()
        if field in allowed and direction in {"asc", "desc"}:
            return f"{field} {direction}"
        return default
    except Exception:
        return default


# --- Prices ---

def _build_prices_domain(
    *,
    product_description: Optional[Union[str, List[str]]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    cursor_id: Optional[int] = None,
    order: Optional[str] = None,
) -> List:
    """Construye el dominio Odoo para filtrar precios Argus de forma consistente."""
    domain: List = []
    # product_description puede ser string o lista de strings
    if product_description:
        if isinstance(product_description, list):
            if len(product_description) == 1:
                domain.append(("product_description", "=", product_description[0]))
            else:
                domain.append(("product_description", "in", product_description))
        else:
            domain.append(("product_description", "=", product_description))
    # Cursor-based pagination when ordering by id
    if cursor_id is not None and order and order.startswith("id "):
        try:
            cid = int(cursor_id)
            if "desc" in order:
                domain.append(("id", "<", cid))
            else:
                domain.append(("id", ">", cid))
        except Exception:
            pass
    # Date filtering: consider records that have either publication_date or fmt_date within range
    if date_from and date_to:
        # AND of two ORs: (pub>=from OR fmt>=from) AND (pub<=to OR fmt<=to)
        domain.extend([
            "&",
            "|", ("publication_date", ">=", date_from), ("fmt_date", ">=", date_from),
            "|", ("publication_date", "<=", date_to), ("fmt_date", "<=", date_to),
        ])
    elif date_from:
        # (pub>=from OR fmt>=from)
        domain.extend(["|", ("publication_date", ">=", date_from), ("fmt_date", ">=", date_from)])
    elif date_to:
        # (pub<=to OR fmt<=to)
        domain.extend(["|", ("publication_date", "<=", date_to), ("fmt_date", "<=", date_to)])

    # Texto libre: product_description/tag ilike q
    if q:
        domain.extend(["|", ("product_description", "ilike", q), ("tag", "ilike", q)])
    return domain


def get_argus_prices(
    limit: int = 80,
    offset: int = 0,
    order: str = "publication_date desc",
    product_description: Optional[Union[str, List[str]]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    with_total: bool = False,
    shape: str | None = None,
    cursor_id: Optional[int] = None,
    date_pref: str = "publication",  # "publication" | "fmt" para shape compact
    q: Optional[str] = None,
) -> ArgusPricePage:
    order = _safe_order(order, _ALLOWED_PRICE_ORDER, "publication_date desc")
    # Cache por combinación de filtros (incluye shape y with_total)
    ck_parts = [
        f"l={limit}", f"o={offset}", f"ord={order}",
        f"pd={product_description or ''}", f"df={date_from or ''}", f"dt={date_to or ''}",
        f"wt={'1' if with_total else '0'}", f"sh={shape or 'full'}",
        f"cur={cursor_id or ''}",
        f"dpref={date_pref}",
        f"q={q or ''}",
    "v=6",  # version bump: include mid/close + unit/currency/delivery fallbacks in payload
    ]
    cache_key = "argus:prices:" + "|".join(ck_parts)
    cached = get_cache(cache_key)
    if cached is not None:
        return cached
    domain = _build_prices_domain(
        product_description=product_description,
        date_from=date_from,
        date_to=date_to,
        q=q,
        cursor_id=cursor_id,
        order=order,
    )
    ARGUS_PRICE_MODEL = "argus.price"
    ARGUS_PRICE_FIELDS_DEFAULT = [
        "product_description","repository_id","id","quote_id","code_id","timestamp_id",
        "continuous_forward","publication_date","fmt_date","value","forward_period","forward_year",
        # include additional price variants
        "value_mid","value_close","value_open",
        "diff_base_roll","pricetype_id","decimal_places","unit_id1","unit_id2",
        "delivery_mode_label","delivery_mode_name","delivery_mode_from_metadata","delivery_mode_raw","delivery_mode_num","delivery_mode_id",
        "diff_base_value","diff_base_timing_id","date_modified","correction","error_id","tag",
        "units_display","unit_from_metadata",
        "currency_unit_id","currency_id","currency_from_metadata",
        "measure_unit_id",
    ]
    ctx = _get_connector().get_context_with_tz({})
    total = 0
    if with_total:
        try:
            total = _get_connector().search_count(ARGUS_PRICE_MODEL, domain, context=ctx)
        except Exception:
            total = 0
    if shape == "compact":
        # Include extra fields needed for robust fallbacks on units/currency/delivery
        fields = [
            "id", "repository_id", "product_description",
            "publication_date", "fmt_date", "value", "value_mid", "value_close", "decimal_places",
            "forward_period", "forward_year", "code_id",
            # Delivery: prefer explicit label, else name, else m2o
            "delivery_mode_label", "delivery_mode_name", "delivery_mode_from_metadata", "delivery_mode_raw", "delivery_mode_num", "delivery_mode_id",
            # Units and currency: prefer many2one, else raw ids to synthesize labels
            "units_display", "unit_from_metadata", "currency_unit_id", "currency_id", "currency_from_metadata", "measure_unit_id", "unit_id1", "unit_id2",
            "diff_base_value",
        ]
    else:
        fields = ARGUS_PRICE_FIELDS_DEFAULT

    lock = _get_lock(cache_key)
    with lock:
        # double-check cache dentro del lock
        cached2 = get_cache(cache_key)
        if cached2 is not None:
            return cached2
        try:
            rows = _get_connector().search_read(
                ARGUS_PRICE_MODEL,
                domain,
                fields=fields,
                order=order,
                limit=limit,
                offset=offset,
                context=ctx,
            )
        except Exception:
            # fallback a copia de respaldo si existe
            stale = _cache_get_with_backup(cache_key)
            if stale is not None:
                return stale
            raise

    # --- Tracking dinámico de max_id para detectar nuevos precios ---
    try:
        if rows:
            ids: List[int] = []
            for r in rows:
                _id = r.get("id")
                if isinstance(_id, int):
                    ids.append(_id)
            current_max = max(ids) if ids else None
            if current_max is not None:
                cache_max_key = "argus:prices:max_id"
                prev_max = get_cache(cache_max_key)
                if not isinstance(prev_max, int) or (isinstance(prev_max, int) and current_max > prev_max):
                    set_cache(cache_max_key, int(current_max), ttl_seconds=CACHE_TTL_ARGUS_PRICES)
    except Exception:
        # No romper la respuesta por métricas; silencioso.
        pass
    if shape == "compact":
        dp = date_pref if date_pref in ("publication", "fmt") else "publication"
        compact_list = [collapse_price_row(r, date_pref=dp) for r in rows]
        # cachear resultado
        out = ArgusPricePage(total_count=total, records=[], records_compact=compact_list)
        _cache_put_with_backup(cache_key, out, ttl=CACHE_TTL_ARGUS_PRICES)
        return out
    normalized = [ArgusPrice(**normalize_argus_price_row(r)) for r in rows]
    out = ArgusPricePage(total_count=total, records=normalized, records_compact=None)
    _cache_put_with_backup(cache_key, out, ttl=CACHE_TTL_ARGUS_PRICES)
    return out


def get_argus_prices_today(
    limit: int = 80,
    offset: int = 0,
    order: str = "publication_date desc",
    product_description: Optional[Union[str, List[str]]] = None,
    with_total: bool = False,
    shape: str | None = None,
    cursor_id: Optional[int] = None,
    date_pref: str = "publication",
    q: Optional[str] = None,
) -> ArgusPricePage:
    """Devuelve precios cuyo `publication_date` o `fmt_date` corresponde al día de hoy

    La fecha "hoy" se calcula usando la zona horaria del usuario recuperada por el conector
    (si está disponible). Delegamos a `get_argus_prices` pasando date_from/date_to iguales.
    """
    # Determinar la "fecha más reciente" cargada en Argus (puede ser publication_date o fmt_date).
    try:
        ctx = _get_connector().get_context_with_tz({})
        # Usar read_group para calcular máximos globales
        res = _get_connector().read_group(
            "argus.price",
            [],
            ["publication_date:max", "fmt_date:max"],
            [],
            context=ctx,
        )
        max_pub = None
        max_fmt = None
        if res and isinstance(res, list) and len(res) > 0:
            row = res[0]
            max_pub = row.get("publication_date_max") or row.get("publication_date:max") or row.get("publication_date")
            max_fmt = row.get("fmt_date_max") or row.get("fmt_date:max") or row.get("fmt_date")
        # Preferir la fecha más reciente entre las dos (si ambas están presentes)
        candidate_dates = []
        if isinstance(max_pub, str) and max_pub:
            candidate_dates.append(max_pub[:10])
        if isinstance(max_fmt, str) and max_fmt:
            candidate_dates.append(max_fmt[:10])
        if candidate_dates:
            # tomar la máxima lexicográficamente (ISO date strings comparables)
            latest = max(candidate_dates)
        else:
            # fallback a UTC hoy si no hay registros
            latest = datetime.utcnow().date().isoformat()
    except Exception:
        latest = datetime.utcnow().date().isoformat()

    # Delegar a get_argus_prices filtrando por la fecha detectada
    return get_argus_prices(
        limit=limit,
        offset=offset,
        order=order,
        product_description=product_description,
        date_from=latest,
        date_to=latest,
        with_total=with_total,
        shape=shape,
        cursor_id=cursor_id,
        date_pref=date_pref,
        q=q,
    )


def get_argus_prices_count(
    *,
    product_description: Optional[Union[str, List[str]]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
) -> int:
    """Devuelve el total de precios que cumplen los filtros; útil para paginación."""
    domain = _build_prices_domain(product_description=product_description, date_from=date_from, date_to=date_to, q=q)
    ctx = _get_connector().get_context_with_tz({})
    return int(_get_connector().search_count("argus.price", domain, context=ctx))


def get_argus_prices_summary(
    group_by: str = "month",
    product_description: Optional[Union[str, List[str]]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    date_pref: str = "publication",
    q: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Agrega precios para dashboards, devolviendo un conjunto pequeño y cacheado.

    group_by:
      - month: agrupa por mes (publication_date o fmt_date)
      - product: agrupa por product_description
      - month_product: mes y producto
    """
    # Normalizar parámetros para la clave de caché
    date_field = "publication_date" if date_pref == "publication" else "fmt_date"
    ck = f"argus:prices:summary:g={group_by}:pd={product_description or ''}:df={date_from or ''}:dt={date_to or ''}:dfld={date_field}:q={q or ''}:v=1"
    cached = get_cache(ck)
    if cached is not None:
        return cached
    # Construir dominio base (sin cursor)
    domain = _build_prices_domain(product_description=product_description, date_from=date_from, date_to=date_to, q=q)
    ctx = _get_connector().get_context_with_tz({})
    # Definir groupby y campos agregados
    groups: List[str] = []
    if group_by == "month":
        groups = [f"{date_field}:month"]
    elif group_by == "product":
        groups = ["product_description"]
    elif group_by == "month_product":
        groups = [f"{date_field}:month", "product_description"]
    else:
        groups = [f"{date_field}:month"]
    fields = ["id:count", "value:avg"]
    rows = _get_connector().read_group("argus.price", domain, fields, groups, context=ctx)
    # Normalización de salida
    out: List[Dict[str, Any]] = []
    for r in rows:
        bucket: Dict[str, Any] = {}
        # Resolver mes si aplica
        if any(":month" in g for g in groups):
            month_val = r.get(f"{date_field}:month") or r.get(date_field)
            if isinstance(month_val, str):
                bucket["month"] = month_val[:7]
            else:
                try:
                    bucket["month"] = str(month_val)[:7]
                except Exception:
                    bucket["month"] = str(month_val)
        # Resolver producto si aplica
        if "product_description" in groups or "product_description" in r:
            bucket["product"] = r.get("product_description")
        bucket["count"] = int(r.get("id_count") or r.get("__count") or 0)
        avg_val = r.get("value_avg")
        try:
            bucket["avg_value"] = float(avg_val) if avg_val is not None else None
        except Exception:
            bucket["avg_value"] = None
        out.append(bucket)
    # Ordenar por mes si existe, luego por producto
    out.sort(key=lambda x: (x.get("month") or "", x.get("product") or ""))
    # Cachear con backup por 15 minutos
    _cache_put_with_backup(ck, out, ttl=900)
    return out


def get_argus_product_descriptions() -> list[str]:
    cache_key = "argus:product_descriptions"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached
    ARGUS_PRICE_MODEL = "argus.price"
    try:
        res = _get_connector().read_group(
            ARGUS_PRICE_MODEL,
            [],
            ["product_description"],
            ["product_description"],
        )
        values = [r.get("product_description") for r in res if r.get("product_description")]
        data = [str(v) for v in values if v is not None]
    except Exception:
        raise
    set_cache(cache_key, data, ttl_seconds=CACHE_TTL_ARGUS_PRODUCTS)
    return data


def get_argus_product_search(q: Optional[str] = None, limit: int = 50) -> list[str]:
    """Búsqueda rápida de productos por texto (ilike). Devuelve strings únicos.

    Usa read_group para agrupar por product_description si es posible, y fallback a search_read.
    """
    cache_key = f"argus:product_search:q={q or ''}:l={limit}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached
    ctx = _get_connector().get_context_with_tz({})
    model = "argus.price"
    try:
        if q:
            domain = [("product_description", "ilike", q)]
        else:
            domain = []
        # Preferir read_group para obtener valores únicos rápidamente
        try:
            rows = _get_connector().read_group(model, domain, ["product_description"], ["product_description"], context=ctx)
            values = [r.get("product_description") for r in rows if r.get("product_description")]
            data = [str(v) for v in values if v is not None][:limit]
        except Exception:
            # Fallback a search_read con fields minimal
            rows = _get_connector().search_read(model, domain, fields=["product_description"], order="product_description asc", limit=limit, offset=0, context=ctx)
            values = [r.get("product_description") for r in rows if r.get("product_description")]
            data = [str(v) for v in values if v is not None]
    except Exception:
        raise
    _cache_put_with_backup(cache_key, data, ttl=min(3600, max(60, limit * 10)))
    return data


# --- News ---

def get_argus_news_list(limit: int = 80, offset: int = 0, order: str = "id desc", fields: Optional[List[str]] = None, cursor_id: Optional[int] = None) -> list[ArgusNewsListItem]:
    order = _safe_order(order, _ALLOWED_NEWS_ORDER, "id desc")
    # Normaliza fields si viene como "id,news_id,..." o ["id,news_id,..."]
    if fields:
        if isinstance(fields, list) and len(fields) == 1 and isinstance(fields[0], str) and "," in fields[0]:
            fields = [f.strip() for f in fields[0].split(",") if f.strip()]
    # Normalizar campos para la clave sin importar orden
    fields_key = "default"
    if fields:
        uniq = sorted(set(fields))
        fields_key = ",".join(uniq)
    cache_key = f"argus:news:list:{limit}:{offset}:{order}:{fields_key}:cur={cursor_id or ''}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached
    lock = _get_lock(cache_key)
    with lock:
        cached2 = get_cache(cache_key)
        if cached2 is not None:
            return cached2
        try:
            ARGUS_NEWS_MODEL = "api.news"
            # Si fields es None, usar un conjunto mínimo recomendado
            default_fields = ["id","news_id","headline","publication_date","free","featured","language_id"]
            domain: List = []
            # Cursor-based pagination when ordering by id
            if cursor_id is not None and order.startswith("id "):
                try:
                    cid = int(cursor_id)
                    if "desc" in order:
                        domain.append(("id", "<", cid))
                    else:
                        domain.append(("id", ">", cid))
                except Exception:
                    pass
            rows = _get_connector().search_read(
                ARGUS_NEWS_MODEL,
                domain,
                fields=fields or default_fields,
                order=order,
                limit=limit,
                offset=offset,
            )
        except Exception:
            stale = _cache_get_with_backup(cache_key)
            if stale is not None:
                return stale
            raise
    normalized = [normalize_argus_news_list_row(r) for r in rows]
    result = [ArgusNewsListItem(**n) for n in normalized]
    _cache_put_with_backup(cache_key, result, ttl=CACHE_TTL_ARGUS_NEWS_LIST)
    return result


def get_argus_news_detail(news_odoo_id: int) -> ArgusNewsDetail | None:
    cache_key = f"argus:news:detail:{news_odoo_id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached
    lock = _get_lock(cache_key)
    with lock:
        cached2 = get_cache(cache_key)
        if cached2 is not None:
            return cached2
        try:
            ARGUS_NEWS_MODEL = "api.news"
            detail_fields = [
                "news_id","headline","publication_date","date_modified","free","featured","language_id",
                "news_type_id","region_ids","sector_ids","context_ids","stream_ids","text_html"
            ]
            # Intento directo por ID
            recs = _get_connector().read(ARGUS_NEWS_MODEL, [int(news_odoo_id)], fields=detail_fields)
            rec = recs[0] if recs else None
            if not rec:
                # Fallback por news_id
                rows = _get_connector().search_read(
                    ARGUS_NEWS_MODEL,
                    [("news_id", "=", str(news_odoo_id))],
                    fields=detail_fields,
                    limit=1,
                )
                rec = rows[0] if rows else None
        except Exception:
            stale = _cache_get_with_backup(cache_key)
            if stale is not None:
                return stale
            raise
    if not rec:
        return None
    normalized = normalize_argus_news_detail_row(rec)
    result = ArgusNewsDetail(**normalized)
    _cache_put_with_backup(cache_key, result, ttl=CACHE_TTL_ARGUS_NEWS_DETAIL)
    return result


# --- Auditoría / Integridad de precios ---
def audit_argus_prices_integrity(*, page_size: int = 2000, cache_ttl: int = 300) -> Dict[str, Any]:
    """Recorre todas las filas de argus.price para verificar que podemos enumerarlas todas.

    Estrategia:
      - Usa paginación incremental por id (id > last_id) para evitar offsets grandes.
      - Compara contra search_count.
      - Devuelve métricas y diferencia vs max_id cacheado para saber si han aparecido nuevos registros.

    Nota: No almacena todos los IDs en caché permanente; sólo realiza validación on-demand.
    """
    cache_key = f"argus:prices:audit:{page_size}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    start = time()
    model = "argus.price"
    ctx = _get_connector().get_context_with_tz({})
    try:
        reported_total = _get_connector().search_count(model, [], context=ctx)
    except Exception as e:
        return {
            "ok": False,
            "error": f"search_count failed: {e}",
        }

    collected_ids: set[int] = set()
    last_id = 0
    loops = 0
    while True:
        loops += 1
        try:
            rows = _get_connector().search_read(
                model,
                [("id", ">", last_id)],
                fields=["id"],
                order="id asc",
                limit=page_size,
                offset=0,
                context=ctx,
            )
        except Exception as e:
            return {
                "ok": False,
                "error": f"search_read failed after {loops} loops: {e}",
                "reported_total": reported_total,
                "fetched_total": len(collected_ids),
            }
        if not rows:
            break
        for r in rows:
            _id = r.get("id")
            if isinstance(_id, int):
                collected_ids.add(_id)
        # avanzar último id
        last_row_id = rows[-1].get("id")
        if isinstance(last_row_id, int):
            last_id = last_row_id
        # micro-corte: si ya igualamos el total reportado podemos salir
        if len(collected_ids) >= reported_total:
            break

    fetched_total = len(collected_ids)
    max_id_odoo = max(collected_ids) if collected_ids else None
    cached_max = get_cache("argus:prices:max_id")
    if not isinstance(cached_max, int):
        cached_max = None
    new_ids_since_cached = (max_id_odoo - cached_max) if (isinstance(max_id_odoo, int) and isinstance(cached_max, int)) else None

    consistent = fetched_total == reported_total
    duration_ms = (time() - start) * 1000

    result: Dict[str, Any] = {
        "ok": True,
        "reported_total": reported_total,
        "fetched_total": fetched_total,
        "consistent": consistent,
        "loops": loops,
        "page_size": page_size,
        "max_id_odoo": max_id_odoo,
        "max_id_cached": cached_max,
        "new_ids_since_cached": new_ids_since_cached,
        "duration_ms": round(duration_ms, 2),
        # Por eficiencia no calculamos missing_ids; si hay inconsistencia podría deberse a inserciones concurrentes.
    }

    # Cachear un breve periodo para evitar abusos.
    set_cache(cache_key, result, ttl_seconds=cache_ttl)
    return result


def bulk_history_by_products(
    *,
    products: List[str],
    limit_per_product: int = 2,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    order: str = "publication_date desc",
) -> Dict[str, List[dict]]:
    """Devuelve las últimas `limit_per_product` filas por cada producto en la lista `products`.

    Resultado: { product_description: [row, row, ...], ... }
    Esta función realiza llamadas search_read por producto en el servidor para agrupar y reducir round-trips desde el cliente.
    """
    if not products:
        return {}
    cache_key = f"argus:prices:bulk_history:limit={limit_per_product}:df={date_from or ''}:dt={date_to or ''}:v=1:products={','.join(products)}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    model = "argus.price"
    ctx = _get_connector().get_context_with_tz({})
    out: Dict[str, List[dict]] = {}
    for p in products:
        dom: List = [("product_description", "=", p)]
        # Apply date filters if present
        if date_from and date_to:
            dom.extend([
                "&",
                "|", ("publication_date", ">=", date_from), ("fmt_date", ">=", date_from),
                "|", ("publication_date", "<=", date_to), ("fmt_date", "<=", date_to),
            ])
        elif date_from:
            dom.extend(["|", ("publication_date", ">=", date_from), ("fmt_date", ">=", date_from)])
        elif date_to:
            dom.extend(["|", ("publication_date", "<=", date_to), ("fmt_date", "<=", date_to)])
        try:
            rows = _get_connector().search_read(
                model,
                dom,
                fields=None,
                order=order,
                limit=limit_per_product,
                offset=0,
                context=ctx,
            )
        except Exception:
            rows = []
        out[p] = rows

    # Cache breve de 60s con backup
    _cache_put_with_backup(cache_key, out, ttl=min(900, max(60, limit_per_product * 5)))
    return out
