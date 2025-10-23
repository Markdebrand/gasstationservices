from pydantic import BaseModel, condecimal
from typing import Optional
from datetime import datetime

class CatalogProductPriceRead(BaseModel):
    product_id: int
    code: str
    name: str
    unit: str
    price_per_unit: Optional[condecimal(max_digits=10, decimal_places=2)] = None  # type: ignore
    effective_from: Optional[datetime] = None

