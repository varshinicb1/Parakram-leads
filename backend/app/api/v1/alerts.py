from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.alert import Alert
from app.models.organization import Organization
from app.utils.security import get_current_user, get_current_organization, require_role
from app.models.user import User
from uuid import UUID

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    result = await db.execute(
        select(Alert).where(Alert.organization_id == org.id)
        .order_by(Alert.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    alerts = result.scalars().all()
    return {"alerts": alerts}
