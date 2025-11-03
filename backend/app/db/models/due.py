from __future__ import annotations

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.types import JSON

from app.db.database import Base
from .enums import ReportStatus


class DueDiligenceReport(Base):
    __tablename__ = "due_diligence_reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    status = Column(String(16), nullable=False, default=ReportStatus.draft.value)
    content = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True))
