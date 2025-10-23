from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from ..db.session import get_session
from ..models.fuel_product import FuelProduct
from ..models.station_fuel_price import StationFuelPrice
from ..schemas.catalog import CatalogProductPriceRead

router = APIRouter()

@router.get("/products", response_model=list[CatalogProductPriceRead])
async def list_catalog_products(
    station_id: int | None = Query(None, description="Optional station id to include current price"),
    session: AsyncSession = Depends(get_session),
):
    # Get active products
    res = await session.execute(select(FuelProduct).where(FuelProduct.is_active == True).order_by(FuelProduct.code))
    products = res.scalars().all()

    price_map: dict[tuple[int, int], StationFuelPrice] = {}
    if station_id is not None:
        # Get current prices (effective_to is NULL) for station
        res = await session.execute(
            select(StationFuelPrice)
            .where(
                StationFuelPrice.station_id == station_id,
                StationFuelPrice.effective_to.is_(None)
            )
        )
        for p in res.scalars().all():
            price_map[(station_id, p.product_id)] = p

    out: list[CatalogProductPriceRead] = []
    for prod in products:
        price = price_map.get((station_id, prod.id)) if station_id is not None else None
        out.append(CatalogProductPriceRead(
            product_id=prod.id,
            code=prod.code,
            name=prod.name,
            unit=prod.unit,
            price_per_unit=(price.price_per_unit if price else None),
            effective_from=(price.effective_from if price else None),
        ))
    return out
