from pydantic import BaseModel, field_validator
from typing import Optional


class LocationBase(BaseModel):
    name: str
    address: str
    lat: float
    lon: float

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name required")
        return v

    @field_validator("address")
    @classmethod
    def addr_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("address required")
        return v


class LocationCreate(LocationBase):
    pass


class LocationRead(LocationBase):
    id: int

    class Config:
        from_attributes = True
