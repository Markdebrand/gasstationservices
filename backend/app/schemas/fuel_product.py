from pydantic import BaseModel
from typing import Optional

class FuelProductRead(BaseModel):
    id: int
    code: str
    name: str
    octane: Optional[int] = None
    unit: str
    is_active: bool

    class Config:
        from_attributes = True
