from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.alert import Alert
from app.utils.security import get_current_user
from app.models.user import User
from uuid import UUID

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).order_by(Alert.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    alerts = result.scalars().all()
    return {"alerts": alerts}
