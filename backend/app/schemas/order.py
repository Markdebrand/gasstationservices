from pydantic import BaseModel
from typing import Literal

class OrderBase(BaseModel):
    user_id: int
    station_id: int
    product_type: Literal["diesel", "regular", "premium"]
    liters: float
    price_per_liter: float
    total_price: float
    delivery_address: str
    delivery_latitude: float
    delivery_longitude: float
    status: Literal["pending", "accepted", "en_route", "completed", "cancelled"] = "pending"

class OrderCreate(OrderBase):
    pass

class OrderUpdateStatus(BaseModel):
    status: Literal["pending", "accepted", "en_route", "completed", "cancelled"]

class OrderRead(OrderBase):
    id: int

    class Config:
        from_attributes = True
