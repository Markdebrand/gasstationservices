from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from ..models.vehicle import Vehicle
from ..models.user import User
from ..schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate
from .deps.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=list[VehicleRead])
async def list_my_vehicles(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    res = await session.execute(select(Vehicle).where(Vehicle.user_id == current_user.id).order_by(Vehicle.created_at.desc()))
    return list(res.scalars().all())


@router.post("/", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    v = Vehicle(
        user_id=current_user.id,
        plate=(payload.plate or "").strip().upper(),
        brand=(payload.brand or "").strip() or None,
        model=(payload.model or "").strip() or None,
        year=(payload.year or "").strip() or None,
        color=(payload.color or "").strip() or None,
        vin=(payload.vin or "").strip() or None,
        photos=payload.photos or [],
    )
    session.add(v)
    await session.commit()
    await session.refresh(v)
    return v


@router.put("/{vehicle_id}", response_model=VehicleRead)
async def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    res = await session.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id))
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    # apply updates
    if payload.plate is not None:
        v.plate = payload.plate.strip().upper()
    if payload.brand is not None:
        v.brand = payload.brand.strip() or None
    if payload.model is not None:
        v.model = payload.model.strip() or None
    if payload.year is not None:
        v.year = payload.year.strip() or None
    if payload.color is not None:
        v.color = payload.color.strip() or None
    if payload.vin is not None:
        v.vin = payload.vin.strip() or None
    if payload.photos is not None:
        v.photos = payload.photos
    await session.commit()
    await session.refresh(v)
    return v


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    res = await session.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id))
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    await session.delete(v)
    await session.commit()
    return None
