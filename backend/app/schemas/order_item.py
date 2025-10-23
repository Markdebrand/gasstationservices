from pydantic import BaseModel, condecimal
from typing import Optional
from decimal import Decimal

class OrderItemBase(BaseModel):
    product_id: int
    quantity_liters: condecimal(max_digits=12, decimal_places=3)  # type: ignore
    unit_price: condecimal(max_digits=10, decimal_places=2)  # type: ignore

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemRead(OrderItemBase):
    id: int
    total_price: condecimal(max_digits=10, decimal_places=2)  # type: ignore

    class Config:
        from_attributes = True
