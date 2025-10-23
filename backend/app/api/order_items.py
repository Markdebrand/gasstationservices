from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal

from ..db.session import get_session
from ..models.order import Order
from ..models.order_item import OrderItem
from ..models.fuel_product import FuelProduct
from ..schemas.order_item import OrderItemCreate, OrderItemRead
from .deps.auth import get_current_admin, get_current_user

router = APIRouter()

@router.get("/{order_id}/items", response_model=list[OrderItemRead])
async def list_order_items(order_id: int, session: AsyncSession = Depends(get_session), _ = Depends(get_current_admin)):
    res = await session.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    return res.scalars().all()

@router.post("/{order_id}/items", response_model=OrderItemRead)
async def add_order_item(order_id: int, item_in: OrderItemCreate, session: AsyncSession = Depends(get_session), _ = Depends(get_current_admin)):
    # ensure order exists
    res = await session.execute(select(Order).where(Order.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # ensure product exists
    res = await session.execute(select(FuelProduct).where(FuelProduct.id == item_in.product_id))
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    total_price = (Decimal(item_in.quantity_liters) * Decimal(item_in.unit_price)).quantize(Decimal("0.01"))

    item = OrderItem(
        order_id=order_id,
        product_id=item_in.product_id,
        quantity_liters=item_in.quantity_liters,
        unit_price=item_in.unit_price,
        total_price=total_price,
    )
    session.add(item)

    # Optionally update order totals to reflect items
    # If you want to keep legacy fields, leave as-is; otherwise, recompute

    await session.commit()
    await session.refresh(item)
    return item
