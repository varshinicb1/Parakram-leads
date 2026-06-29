from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models.audit import AuditLog
from app.models.organization import Organization
from app.utils.security import get_current_user, get_current_organization, require_role
from app.models.user import User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class AuditEntryResponse(BaseModel):
    id: str
    organization_id: Optional[str]
    user_id: Optional[str]
    action: str
    resource: Optional[str]
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: str


class AuditListResponse(BaseModel):
    entries: list[AuditEntryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    resource: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin")),
):
    base_filter = [AuditLog.organization_id == org.id]
    if action:
        base_filter.append(AuditLog.action == action)
    if resource:
        base_filter.append(AuditLog.resource == resource)
    if user_id:
        base_filter.append(AuditLog.user_id == user_id)

    total_query = select(func.count(AuditLog.id)).where(*base_filter)
    total = (await db.execute(total_query)).scalar() or 0

    query = (
        select(AuditLog)
        .where(*base_filter)
        .order_by(desc(AuditLog.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    entries = result.scalars().all()

    return AuditListResponse(
        entries=[
            AuditEntryResponse(
                id=str(e.id),
                organization_id=str(e.organization_id) if e.organization_id else None,
                user_id=str(e.user_id) if e.user_id else None,
                action=e.action,
                resource=e.resource,
                resource_id=e.resource_id,
                details=e.details,
                ip_address=e.ip_address,
                created_at=e.created_at.isoformat() if e.created_at else "",
            )
            for e in entries
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=max(1, (total + per_page - 1) // per_page),
    )
