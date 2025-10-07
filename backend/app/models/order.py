from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Float, Integer, Enum
from ..db.base import Base, TimestampMixin
import enum

class OrderStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    en_route = "en_route"
    completed = "completed"
    cancelled = "cancelled"

class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    station_id: Mapped[int] = mapped_column(ForeignKey("stations.id"), index=True)

    product_type: Mapped[str] = mapped_column(String(50))  # e.g., diesel, regular, premium
    liters: Mapped[float] = mapped_column(Float)
    price_per_liter: Mapped[float] = mapped_column(Float)
    total_price: Mapped[float] = mapped_column(Float)

    delivery_address: Mapped[str] = mapped_column(String(255))
    delivery_latitude: Mapped[float] = mapped_column(Float)
    delivery_longitude: Mapped[float] = mapped_column(Float)

    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.pending)

    user = relationship("User", back_populates="orders")
    station = relationship("Station", back_populates="orders")
