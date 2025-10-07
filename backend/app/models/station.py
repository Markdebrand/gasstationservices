from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Float
from ..db.base import Base, TimestampMixin

class Station(Base, TimestampMixin):
    __tablename__ = "stations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    address: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    orders = relationship("Order", back_populates="station")
