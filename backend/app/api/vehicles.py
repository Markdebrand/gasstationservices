from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.responses import JSONResponse

from ..db.session import get_session
from ..models.vehicle import Vehicle
from ..models.user import User
from ..schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate
from .deps.auth import get_current_user
import os

router = APIRouter()

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../uploads'))
os.makedirs(UPLOADS_DIR, exist_ok=True)


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
    # Delete associated photos from uploads dir if they are local
    if v.photos:
        for url in v.photos:
            if isinstance(url, str) and url.startswith("/uploads/"):
                filename = url.split("/uploads/")[-1]
                file_path = os.path.join(UPLOADS_DIR, filename)
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception:
                    pass
    await session.delete(v)
    await session.commit()
    return None


@router.post("/upload-photo", response_model=dict)
async def upload_vehicle_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Only allow images
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    # Save file with a unique name
    ext = os.path.splitext(file.filename)[1]
    import uuid
    filename = f"{current_user.id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOADS_DIR, filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    # Build public URL
    url = f"/uploads/{filename}"
    return {"url": url}
