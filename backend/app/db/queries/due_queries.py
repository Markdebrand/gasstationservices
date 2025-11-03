from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session

from app.db import models as m


# Listing helpers

def list_reports_by_owner(db: Session, owner_id: int, limit: int = 50, offset: int = 0) -> list[m.DueDiligenceReport]:
    limit = max(1, min(200, int(limit)))
    offset = max(0, int(offset))
    return (
        db.query(m.DueDiligenceReport)
        .filter(m.DueDiligenceReport.owner_id == owner_id)
        .order_by(m.DueDiligenceReport.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def list_reports_all(db: Session, limit: int = 200, offset: int = 0) -> list[m.DueDiligenceReport]:
    limit = max(1, min(500, int(limit)))
    offset = max(0, int(offset))
    return (
        db.query(m.DueDiligenceReport)
        .order_by(m.DueDiligenceReport.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# Single-object helpers

def get_report_by_id(db: Session, report_id: int) -> Optional[m.DueDiligenceReport]:
    return db.query(m.DueDiligenceReport).filter(m.DueDiligenceReport.id == report_id).first()


def get_report_for_owner(db: Session, report_id: int, owner_id: int) -> Optional[m.DueDiligenceReport]:
    return (
        db.query(m.DueDiligenceReport)
        .filter(m.DueDiligenceReport.id == report_id, m.DueDiligenceReport.owner_id == owner_id)
        .first()
    )


# Mutations

def create_report(db: Session, owner_id: int, created_by: int, title: str, status: str) -> m.DueDiligenceReport:
    report = m.DueDiligenceReport(owner_id=owner_id, created_by=created_by, title=title, status=status)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def delete_report(db: Session, report: m.DueDiligenceReport) -> None:
    db.delete(report)
    db.commit()
