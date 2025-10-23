from pydantic import BaseModel, Field
from typing import Optional, List


class VehicleBase(BaseModel):
    plate: str = Field(..., min_length=1)
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    color: Optional[str] = None
    vin: Optional[str] = None
    photos: Optional[List[str]] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    plate: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    color: Optional[str] = None
    vin: Optional[str] = None
    photos: Optional[List[str]] = None


class VehicleRead(VehicleBase):
    id: int

    class Config:
        from_attributes = True
