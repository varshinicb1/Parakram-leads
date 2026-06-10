from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.database import get_db
from app.models.lead import Lead, LeadCategory
from app.models.message import Message
from app.schemas.lead import LeadResponse, LeadListResponse, LeadCreate, LeadUpdate, LeadApproveOutreach
from app.schemas.message import MessageResponse, DashboardResponse
from app.utils.security import get_current_user
from app.models.user import User
from uuid import UUID

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=LeadListResponse)
async def list_leads(
    page: int = 1,
    per_page: int = 20,
    category: str = None,
    status: str = None,
    industry: str = None,
    source: str = None,
    search: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Lead)
    count_query = select(func.count(Lead.id))

    if category:
        query = query.where(Lead.category_flag == category)
        count_query = count_query.where(Lead.category_flag == category)
    if status:
        query = query.where(Lead.status == status)
        count_query = count_query.where(Lead.status == status)
    if industry:
        query = query.where(Lead.industry == industry)
        count_query = count_query.where(Lead.industry == industry)
    if source:
        query = query.where(Lead.source == source)
        count_query = count_query.where(Lead.source == source)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            Lead.business_name.ilike(search_filter) |
            Lead.owner_name.ilike(search_filter) |
            Lead.industry.ilike(search_filter)
        )
        count_query = count_query.where(
            Lead.business_name.ilike(search_filter) |
            Lead.owner_name.ilike(search_filter) |
            Lead.industry.ilike(search_filter)
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    hot_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.HOT)
    )
    hot = hot_result.scalar()

    warm_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.WARM)
    )
    warm = warm_result.scalar()

    cold_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.COLD)
    )
    cold = cold_result.scalar()

    query = query.order_by(Lead.opportunity_score.desc(), Lead.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    leads = result.scalars().all()

    return LeadListResponse(
        total=total, hot=hot, warm=warm, cold=cold,
        leads=[LeadResponse.model_validate(l) for l in leads],
    )


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse.model_validate(lead)


@router.post("", response_model=LeadResponse, status_code=201)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = Lead(**data.model_dump())
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, key, value)
    await db.flush()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)


@router.post("/{lead_id}/approve-outreach", response_model=LeadResponse)
async def approve_outreach(
    lead_id: UUID,
    data: LeadApproveOutreach,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if data.whatsapp_message:
        lead.outreach_message_whatsapp = data.whatsapp_message
    if data.email_message:
        lead.outreach_message_email = data.email_message
    if data.linkedin_message:
        lead.outreach_message_linkedin = data.linkedin_message
    lead.outreach_approved = True
    await db.flush()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)
