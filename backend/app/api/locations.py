from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..db.session import get_session
from ..models.location import SavedLocation
from ..models.user import User
from ..schemas.location import LocationCreate, LocationRead
from .deps.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=list[LocationRead])
async def list_locations(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    res = await session.execute(select(SavedLocation).where(SavedLocation.user_id == current_user.id).order_by(SavedLocation.created_at.desc()))
    return list(res.scalars().all())


@router.post("/", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
async def create_location(
    payload: LocationCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    loc = SavedLocation(
        user_id=current_user.id,
        name=payload.name.strip(),
        address=payload.address.strip(),
        lat=float(payload.lat),
        lon=float(payload.lon),
    )
    session.add(loc)
    await session.commit()
    await session.refresh(loc)
    return loc


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Ensure it belongs to current user
    q = select(SavedLocation).where(SavedLocation.id == location_id, SavedLocation.user_id == current_user.id)
    res = await session.execute(q)
    loc = res.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    await session.delete(loc)
    await session.commit()
    return None
