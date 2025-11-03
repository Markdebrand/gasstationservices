from __future__ import annotations

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Text,
    UniqueConstraint,
    Index,
    func,
    LargeBinary,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class SharingInvitation(Base):
    """Invitación para que un usuario (invitee) comparta datos Plaid con otro (inviter).

    Flujo:
    - Se crea con email destino (invitee_email) y scopes solicitados.
    - El invitee accede al enlace con token y tras autenticarse se vincula (invitee_user_id).
    - Tras vincular Plaid y dar consentimiento -> status = CONSENT_GIVEN.
    - Puede revocarse posteriormente (status = REVOKED).
    """
    __tablename__ = "sharing_invitations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    inviter_user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    invitee_user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True)
    invitee_email = Column(String(255), nullable=False, index=True)
    token = Column(String(72), unique=True, nullable=False, index=True)
    # JSON textual: {"balance": true, "identity": false, ...}
    requested_scopes = Column(Text, nullable=False)
    granted_scopes = Column(Text, nullable=True)  # copia final aceptada (puede ser subset)
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING | LINKED | CONSENT_GIVEN | REVOKED | EXPIRED | REJECTED
    plaid_item_id = Column(String(128), nullable=True, index=True)
    consented_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    inviter = relationship("User", foreign_keys=[inviter_user_id])
    invitee = relationship("User", foreign_keys=[invitee_user_id])

    __table_args__ = (
        Index("ix_sharing_invitations_inviter_status", "inviter_user_id", "status"),
    )


class SharingSnapshot(Base):
    """Snapshot de datos compartidos autorizados (balance, identity, etc.).

    Se almacena como payload binario (JSON utf-8) para permitir futuro cifrado.
    """
    __tablename__ = "sharing_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invitation_id = Column(Integer, ForeignKey("sharing_invitations.id", ondelete="CASCADE"), nullable=False, index=True)
    data_type = Column(String(32), nullable=False, index=True)  # balance | identity | transactions | investments
    payload = Column(LargeBinary, nullable=False)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invitation = relationship("SharingInvitation")

    __table_args__ = (
        Index("ix_sharing_snapshots_type_fetched", "data_type", "fetched_at"),
        Index("ix_sharing_snapshots_invitation_type_fetched", "invitation_id", "data_type", "fetched_at"),
    )
