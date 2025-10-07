from pydantic import BaseModel

class StationBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float

class StationCreate(StationBase):
    pass

class StationRead(StationBase):
    id: int

    class Config:
        from_attributes = True
