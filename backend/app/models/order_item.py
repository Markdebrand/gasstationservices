from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, DECIMAL
from ..db.base import Base, TimestampMixin
from decimal import Decimal

class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("fuel_products.id"), index=True)

    quantity_liters: Mapped[Decimal] = mapped_column(DECIMAL(12, 3))
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2))
    total_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2))

    order = relationship("Order", back_populates="items")
    product = relationship("FuelProduct")
