from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, DECIMAL, Enum, DateTime
from ..db.base import Base, TimestampMixin
from decimal import Decimal
import enum
from datetime import datetime

class DeliveryEventType(str, enum.Enum):
    assigned = "assigned"
    accepted = "accepted"
    en_route = "en_route"
    arrived = "arrived"
    fueling_started = "fueling_started"
    fueling_completed = "fueling_completed"
    completed = "completed"
    cancelled = "cancelled"

class DeliveryEvent(Base, TimestampMixin):
    __tablename__ = "delivery_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("delivery_assignments.id"), index=True)
    type: Mapped[DeliveryEventType] = mapped_column(Enum(DeliveryEventType))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    latitude: Mapped[Decimal | None] = mapped_column(DECIMAL(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(DECIMAL(9, 6), nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    assignment = relationship("DeliveryAssignment", back_populates="events")
