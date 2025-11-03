"""Batch expiration script for sharing invitations.
Run manually or via cron:
    python -m app.scripts.expire_sharing_invitations
"""
from __future__ import annotations
from datetime import datetime, timezone
from app.db.database import SessionLocal
from app.db.models import SharingInvitation


def expire_batch(limit: int = 500) -> int:
    now = datetime.now(timezone.utc)
    updated = 0
    with SessionLocal() as db:
        rows = (
            db.query(SharingInvitation)
            .filter(SharingInvitation.status.in_(["PENDING", "LINKED", "CONSENT_GIVEN"]))
            .filter(SharingInvitation.expires_at.isnot(None))
            .filter(SharingInvitation.expires_at < now)
            .limit(limit)
            .all()
        )
        for r in rows:
            r.status = "EXPIRED"
            updated += 1
        if updated:
            db.commit()
    return updated


def main():
    total = 0
    while True:
        n = expire_batch()
        if not n:
            break
        total += n
    print(f"Expired {total} sharing invitations.")


if __name__ == "__main__":  # pragma: no cover
    main()
