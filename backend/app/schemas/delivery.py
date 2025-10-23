from pydantic import BaseModel, condecimal
from typing import Optional, Literal
from decimal import Decimal
from datetime import datetime

DeliveryEventType = Literal[
    "assigned","accepted","en_route","arrived","fueling_started","fueling_completed","completed","cancelled"
]

class DeliveryAssignmentCreate(BaseModel):
    order_id: int
    driver_user_id: int
    assigned_at: Optional[datetime] = None

class DeliveryAssignmentRead(BaseModel):
    id: int
    order_id: int
    driver_user_id: int
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    arrived_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DeliveryEventCreate(BaseModel):
    assignment_id: int
    type: DeliveryEventType
    at: Optional[datetime] = None
    latitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None  # type: ignore
    longitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None  # type: ignore
    note: Optional[str] = None
    photo_url: Optional[str] = None

class DeliveryEventRead(BaseModel):
    id: int
    assignment_id: int
    type: DeliveryEventType
    at: datetime
    latitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None  # type: ignore
    longitude: Optional[condecimal(max_digits=9, decimal_places=6)] = None  # type: ignore
    note: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True
