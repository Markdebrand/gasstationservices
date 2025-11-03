from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from ..db.session import get_session
from ..models.order import Order
from ..models.delivery_assignment import DeliveryAssignment
from ..models.delivery_event import DeliveryEvent, DeliveryEventType
from ..schemas.delivery import DeliveryAssignmentCreate, DeliveryAssignmentRead, DeliveryEventCreate, DeliveryEventRead
from .deps.auth import get_current_admin

router = APIRouter()

@router.post("/assignments", response_model=DeliveryAssignmentRead)
async def create_assignment(payload: DeliveryAssignmentCreate, session: AsyncSession = Depends(get_session), _ = Depends(get_current_admin)):
    res = await session.execute(select(Order).where(Order.id == payload.order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Ensure not already assigned
    res = await session.execute(select(DeliveryAssignment).where(DeliveryAssignment.order_id == payload.order_id))
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Order already has an assignment")

    assigned_at = payload.assigned_at or datetime.now(timezone.utc)
    assignment = DeliveryAssignment(
        order_id=payload.order_id,
        driver_user_id=payload.driver_user_id,
        assigned_at=assigned_at,
    )
    session.add(assignment)
    await session.commit()
    await session.refresh(assignment)
    return assignment

@router.get("/assignments/{order_id}", response_model=DeliveryAssignmentRead)
async def get_assignment(order_id: int, session: AsyncSession = Depends(get_session), _ = Depends(get_current_admin)):
    res = await session.execute(select(DeliveryAssignment).where(DeliveryAssignment.order_id == order_id))
    assignment = res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

@router.post("/assignments/{assignment_id}/events", response_model=DeliveryEventRead)
async def add_event(assignment_id: int, payload: DeliveryEventCreate, session: AsyncSession = Depends(get_session), _ = Depends(get_current_admin)):
    res = await session.execute(select(DeliveryAssignment).where(DeliveryAssignment.id == assignment_id))
    assignment = res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    at = payload.at or datetime.now(timezone.utc)
    event = DeliveryEvent(
        assignment_id=assignment_id,
        type=DeliveryEventType(payload.type),
        at=at,
        latitude=payload.latitude,
        longitude=payload.longitude,
        note=payload.note,
        photo_url=payload.photo_url,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event

@router.get("/assignments/{assignment_id}/events", response_model=list[DeliveryEventRead])
async def list_events(assignment_id: int, session: AsyncSession = Depends(get_session), _ = Depends(get_current_admin)):
    res = await session.execute(select(DeliveryEvent).where(DeliveryEvent.assignment_id == assignment_id).order_by(DeliveryEvent.at))
    return res.scalars().all()
