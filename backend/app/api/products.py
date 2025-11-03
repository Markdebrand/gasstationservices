from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from ..models.fuel_product import FuelProduct
from ..schemas.fuel_product import FuelProductRead
from .deps.auth import get_current_admin

router = APIRouter()

@router.get("/", response_model=list[FuelProductRead])
async def list_products(
    session: AsyncSession = Depends(get_session),
    _ = Depends(get_current_admin),
):
    res = await session.execute(select(FuelProduct).order_by(FuelProduct.code))
    return res.scalars().all()
