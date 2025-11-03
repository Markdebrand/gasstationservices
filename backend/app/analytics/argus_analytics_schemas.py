from pydantic import BaseModel
from typing import Optional, List, Literal


class TodayChangeItem(BaseModel):
    # Identidad de la serie
    description: str
    deliveryMode: Optional[str] = None
    units: Optional[str] = None
    unitLabel: Optional[str] = None
    currency: Optional[str] = None
    repoId: Optional[int] = None
    forwardPeriod: Optional[str] = None

    # Valores
    lastDate: Optional[str] = None
    lastPrice: Optional[float] = None
    prevDate: Optional[str] = None
    prevPrice: Optional[float] = None

    absChange: Optional[float] = None
    pctChange: Optional[float] = None
    direction: Optional[Literal["up", "down", "flat"]] = None


class SeriesPoint(BaseModel):
    t: str  # ISO date
    p: float


class SeriesMeta(BaseModel):
    description: str
    deliveryMode: Optional[str] = None
    units: Optional[str] = None
    unitLabel: Optional[str] = None
    currency: Optional[str] = None
    repoId: Optional[int] = None
    forwardPeriod: Optional[str] = None


class SeriesResponse(BaseModel):
    points: List[SeriesPoint]
    ma7: Optional[List[float]] = None
    ma30: Optional[List[float]] = None
    z20: Optional[List[float]] = None
    meta: SeriesMeta


class ForwardCurvePoint(BaseModel):
    month: str
    price: float


class ForwardCurveResponse(BaseModel):
    on: str
    points: List[ForwardCurvePoint]
    slopes: Optional[dict] = None
