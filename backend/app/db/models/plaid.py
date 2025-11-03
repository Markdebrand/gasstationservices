from __future__ import annotations

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary, UniqueConstraint, func, Index
from sqlalchemy.orm import relationship

from app.db.database import Base


class PlaidItem(Base):
    __tablename__ = "plaid_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String(128), nullable=False, index=True)
    access_token_enc = Column(LargeBinary, nullable=False)
    institution_name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="uq_plaid_items_user_item"),
        Index("ix_plaid_items_user_created", "user_id", "id"),
    )


class PlaidIdentityVerification(Base):
    """Almacena sesiones de Identity Verification de Plaid.

    No guarda PII sensible (document images / numbers). Sólo estado y payload resumido.
    """
    __tablename__ = "plaid_identity_verifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    plaid_session_id = Column(String(128), nullable=False, index=True, unique=True)
    template_id = Column(String(128), nullable=True)
    status = Column(String(64), nullable=False, index=True)  # created | in_progress | completed | failed | needs_review | etc
    last_payload = Column(String(4000), nullable=True)  # JSON string (truncado si es grande)
    attempt_no = Column(Integer, nullable=False, server_default="1")
    approved_at = Column(DateTime(timezone=True), nullable=True)
    failed_reason = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User")

    __table_args__ = (
        Index("ix_plaid_idv_user_status", "user_id", "status"),
    )
