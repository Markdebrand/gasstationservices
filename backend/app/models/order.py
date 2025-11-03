from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Integer, Enum, DECIMAL
from ..db.base import Base, TimestampMixin
import enum
from decimal import Decimal

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
    liters: Mapped[Decimal] = mapped_column(DECIMAL(12, 3))
    price_per_liter: Mapped[Decimal] = mapped_column(DECIMAL(10, 2))
    total_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2))

    delivery_address: Mapped[str] = mapped_column(String(255))
    delivery_latitude: Mapped[Decimal] = mapped_column(DECIMAL(9, 6))
    delivery_longitude: Mapped[Decimal] = mapped_column(DECIMAL(9, 6))

    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.pending)

    user = relationship("User", back_populates="orders")
    station = relationship("Station", back_populates="orders")
    # Optional multi-item support (new table order_items)
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
