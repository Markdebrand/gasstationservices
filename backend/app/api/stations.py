from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from ..models.station import Station
from ..schemas.station import StationCreate, StationRead
from .deps.auth import get_current_admin

router = APIRouter()


from fastapi import Query

@router.get("/", response_model=list[StationRead])
async def list_stations(
    session: AsyncSession = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    name: str | None = Query(None)
):
    stmt = select(Station)
    if name:
        stmt = stmt.where(Station.name.ilike(f"%{name}%"))
    stmt = stmt.offset(skip).limit(limit)
    result = await session.execute(stmt)
    stations = result.scalars().all()
    return stations

@router.post("/", response_model=StationRead)
async def create_station(station_in: StationCreate, session: AsyncSession = Depends(get_session), _admin= Depends(get_current_admin)):
    station = Station(**station_in.model_dump())
    session.add(station)
    await session.commit()
    await session.refresh(station)
    return station
