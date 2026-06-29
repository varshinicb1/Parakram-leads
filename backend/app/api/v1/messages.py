from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from app.database import get_db
from app.models.message import Message, MessageStatus
from app.models.lead import Lead, LeadCategory, LeadStatus
from app.models.organization import Organization
from app.schemas.message import MessageResponse, DashboardResponse
from app.utils.security import get_current_user, get_current_organization, require_role
from app.models.user import User
from uuid import UUID

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("", response_model=list[MessageResponse])
async def list_messages(
    lead_id: UUID = None,
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    query = select(Message).where(Message.organization_id == org.id)
    if lead_id:
        # Verify the lead belongs to this org
        lead_result = await db.execute(
            select(Lead).where(Lead.id == lead_id, Lead.organization_id == org.id)
        )
        if not lead_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Lead not found")
        query = query.where(Message.lead_id == lead_id)
    query = query.order_by(Message.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    messages = result.scalars().all()
    return [MessageResponse.model_validate(m) for m in messages]


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    org_filter = Lead.organization_id == org.id
    total = (await db.execute(select(func.count(Lead.id)).where(org_filter))).scalar()
    hot = (await db.execute(select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.HOT, org_filter))).scalar()
    warm = (await db.execute(select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.WARM, org_filter))).scalar()
    cold = (await db.execute(select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.COLD, org_filter))).scalar()

    # Pipeline status counts
    status_counts = {}
    for s in LeadStatus:
        cnt = (await db.execute(
            select(func.count(Lead.id)).where(Lead.status == s.value, org_filter)
        )).scalar()
        status_counts[s.value] = cnt

    messages_sent = (await db.execute(
        select(func.count(Message.id)).where(Message.organization_id == org.id, Message.status == MessageStatus.SENT)
    )).scalar()
    responses = (await db.execute(
        select(func.count(Message.id)).where(Message.organization_id == org.id, Message.status == MessageStatus.REPLIED)
    )).scalar()

    pipeline_result = await db.execute(
        select(func.sum(Lead.estimated_project_value)).where(org_filter)
    )
    pipeline_value = pipeline_result.scalar() or 0.0

    conversion_rate = (responses / messages_sent * 100) if messages_sent > 0 else 0.0
    revenue_forecast = pipeline_value * (conversion_rate / 100) if conversion_rate > 0 else pipeline_value * 0.05

    # Predictive Intelligence Metrics
    analyzed_filter = and_(org_filter, Lead.last_intelligence_update.isnot(None))

    high_priority = (await db.execute(
        select(func.count(Lead.id)).where(
            and_(org_filter, or_(
                Lead.predictive_quality_score >= 70,
                Lead.buying_urgency >= 70,
            ))
        )
    )).scalar()

    actionable_filter = and_(
        org_filter,
        Lead.category_flag.in_([LeadCategory.HOT, LeadCategory.WARM]),
        Lead.status.in_([LeadStatus.DISCOVERED, LeadStatus.ANALYZED, LeadStatus.APPROVED]),
    )
    ready_to_contact = (await db.execute(
        select(func.count(Lead.id)).where(actionable_filter)
    )).scalar()

    avg_quality = (await db.execute(
        select(func.avg(Lead.predictive_quality_score)).where(analyzed_filter)
    )).scalar() or 0.0

    avg_conversion = (await db.execute(
        select(func.avg(Lead.conversion_probability)).where(analyzed_filter)
    )).scalar() or 0.0

    # Top lead by predictive quality
    top_lead_result = await db.execute(
        select(Lead)
        .where(analyzed_filter)
        .order_by(Lead.predictive_quality_score.desc())
        .limit(1)
    )
    top_lead_row = top_lead_result.scalar_one_or_none()
    top_lead = None
    if top_lead_row:
        top_lead = {
            "id": str(top_lead_row.id),
            "business_name": top_lead_row.business_name,
            "industry": top_lead_row.industry or "Unknown",
            "quality_score": top_lead_row.predictive_quality_score,
            "conversion_probability": top_lead_row.conversion_probability,
            "buying_urgency": top_lead_row.buying_urgency,
            "optimal_channel": top_lead_row.optimal_channel or "email",
            "category_flag": top_lead_row.category_flag,
        }

    return DashboardResponse(
        total_leads=total,
        hot_leads=hot,
        warm_leads=warm,
        cold_leads=cold,
        messages_sent=messages_sent,
        responses=responses,
        meetings_scheduled=0,
        estimated_pipeline_value=float(pipeline_value),
        conversion_rate=round(conversion_rate, 2),
        revenue_forecast=round(revenue_forecast, 2),
        high_priority_leads=high_priority,
        leads_ready_to_contact=ready_to_contact,
        avg_quality_score=round(float(avg_quality), 1),
        avg_conversion_probability=round(float(avg_conversion), 4),
        top_lead=top_lead,
        pipeline_counts=status_counts,
    )
