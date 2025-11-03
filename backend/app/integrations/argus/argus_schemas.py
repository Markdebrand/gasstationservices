from pydantic import BaseModel
from typing import Optional, List, Any


class ArgusPrice(BaseModel):
    product_description: Optional[str] = None
    repository_id: Optional[int] = None
    id: Optional[int] = None
    quote_id: Optional[int] = None
    code_id: Optional[str] = None
    timestamp_id: Optional[int] = None
    continuous_forward: Optional[bool] = None
    publication_date: Optional[str] = None
    fmt_date: Optional[str] = None
    # Price (low/min) and additional variants
    value: Optional[str] = None            # Low / Min (PricetypeId=1)
    value_mid: Optional[str] = None        # Mid (PricetypeId=8)
    value_close: Optional[str] = None      # High / Close (PricetypeId=2)
    forward_period: Optional[str] = None
    forward_year: Optional[int] = None
    diff_base_roll: Optional[str] = None
    pricetype_id: Optional[int] = None
    decimal_places: Optional[int] = None
    unit_id1: Optional[int] = None
    unit1_label: Optional[str] = None
    unit_id2: Optional[int] = None
    unit2_label: Optional[str] = None
    delivery_mode_label: Optional[str] = None
    diff_base_value: Optional[str] = None
    diff_base_timing_id: Optional[int] = None
    date_modified: Optional[str] = None
    correction: Optional[str] = None
    error_id: Optional[int] = None
    tag: Optional[str] = None


class ArgusPricePage(BaseModel):
    total_count: int
    records: List[ArgusPrice]
    # opcionalmente, si shape=compact, retornaremos records_compact y records quedará vacío
    records_compact: Optional[List[dict]] = None


class ArgusNewsListItem(BaseModel):
    id: Optional[int] = None
    news_id: Optional[str] = None
    headline: Optional[str] = None
    publication_date: Optional[str] = None
    free: Optional[bool] = None
    featured: Optional[bool] = None
    language_id: Optional[List[Any]] = None


class ArgusNewsDetail(BaseModel):
    news_id: Optional[str] = None
    headline: Optional[str] = None
    publication_date: Optional[str] = None
    date_modified: Optional[str] = None
    free: Optional[bool] = None
    featured: Optional[bool] = None
    language_id: Optional[List[Any]] = None
    news_type_id: Optional[List[Any]] = None
    region_ids: Optional[List[Any]] = None
    sector_ids: Optional[List[Any]] = None
    context_ids: Optional[List[Any]] = None
    stream_ids: Optional[List[Any]] = None
    text_html: Optional[str] = None
