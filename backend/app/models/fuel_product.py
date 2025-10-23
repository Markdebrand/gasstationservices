from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean
from ..db.base import Base, TimestampMixin

class FuelProduct(Base, TimestampMixin):
    __tablename__ = "fuel_products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    octane: Mapped[int | None] = mapped_column(nullable=True)
    unit: Mapped[str] = mapped_column(String(10), default="L")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
