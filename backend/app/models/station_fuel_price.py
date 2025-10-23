from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, DECIMAL, DateTime
from ..db.base import Base, TimestampMixin
from datetime import datetime

class StationFuelPrice(Base, TimestampMixin):
    __tablename__ = "station_fuel_prices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("stations.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("fuel_products.id"), index=True)
    price_per_unit: Mapped[float] = mapped_column(DECIMAL(10, 2))
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Optional relationships
    station = relationship("Station")
    product = relationship("FuelProduct")
