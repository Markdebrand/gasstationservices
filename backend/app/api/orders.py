from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from ..models.order import Order, OrderStatus
from ..schemas.order import OrderCreate, OrderRead, OrderUpdateStatus
from .deps.auth import get_current_user, get_current_admin

router = APIRouter()


from fastapi import Query

@router.get("/", response_model=list[OrderRead])
async def list_orders(
    session: AsyncSession = Depends(get_session),
    _admin = Depends(get_current_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None)
):
    stmt = select(Order)
    if status:
        stmt = stmt.where(Order.status == status)
    stmt = stmt.offset(skip).limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=OrderRead)
async def create_order(order_in: OrderCreate, session: AsyncSession = Depends(get_session), _user = Depends(get_current_user)):
    order = Order(**order_in.model_dump())
    session.add(order)
    await session.commit()
    await session.refresh(order)
    return order

@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_status(order_id: int, update: OrderUpdateStatus, session: AsyncSession = Depends(get_session), _ = Depends(get_current_admin)):
    result = await session.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = OrderStatus(update.status)
    await session.commit()
    await session.refresh(order)
    return order
