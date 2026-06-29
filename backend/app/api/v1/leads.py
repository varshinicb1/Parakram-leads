from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.lead import Lead, LeadCategory, LeadStatus
from app.models.organization import Organization
from app.models.message import Message
from app.schemas.lead import LeadResponse, LeadListResponse, LeadCreate, LeadUpdate, LeadApproveOutreach
from app.schemas.message import MessageResponse, DashboardResponse
from app.utils.security import get_current_user, get_current_organization, require_role
from app.models.user import User
from uuid import UUID
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.services.version_history_service import VersionHistoryService

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
    sort_by: str = None,
    sort_order: str = "desc",
    min_quality: float = None,
    max_quality: float = None,
    min_opportunity: float = None,
    max_opportunity: float = None,
    project_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    base_filter = [Lead.organization_id == org.id]

    if project_id:
        base_filter.append(Lead.project_id == project_id)

    if category:
        base_filter.append(Lead.category_flag == category)
    if status:
        base_filter.append(Lead.status == status)
    if industry:
        base_filter.append(Lead.industry == industry)
    if source:
        base_filter.append(Lead.source == source)
    if min_quality is not None:
        base_filter.append(Lead.predictive_quality_score >= min_quality)
    if max_quality is not None:
        base_filter.append(Lead.predictive_quality_score <= max_quality)
    if min_opportunity is not None:
        base_filter.append(Lead.opportunity_score >= min_opportunity)
    if max_opportunity is not None:
        base_filter.append(Lead.opportunity_score <= max_opportunity)
    if search:
        search_filter = f"%{search}%"
        base_filter.append(
            Lead.business_name.ilike(search_filter) |
            Lead.owner_name.ilike(search_filter) |
            Lead.industry.ilike(search_filter) |
            Lead.phone.ilike(search_filter) |
            Lead.location.ilike(search_filter)
        )

    query = select(Lead).where(*base_filter)
    count_query = select(func.count(Lead.id)).where(*base_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    hot_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.HOT, Lead.organization_id == org.id)
    )
    hot = hot_result.scalar()

    warm_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.WARM, Lead.organization_id == org.id)
    )
    warm = warm_result.scalar()

    cold_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.category_flag == LeadCategory.COLD, Lead.organization_id == org.id)
    )
    cold = cold_result.scalar()

    sort_map = {
        "business_name": Lead.business_name,
        "created_at": Lead.created_at,
        "opportunity_score": Lead.opportunity_score,
        "quality_score": Lead.predictive_quality_score,
        "conversion_probability": Lead.conversion_probability,
        "buying_urgency": Lead.buying_urgency,
        "category_flag": Lead.category_flag,
        "industry": Lead.industry,
        "location": Lead.location,
        "source": Lead.source,
    }
    sort_col = sort_map.get(sort_by, Lead.opportunity_score)
    order_fn = sort_col.desc if sort_order == "desc" else sort_col.asc
    query = query.order_by(order_fn(), Lead.created_at.desc())
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
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.organization_id == org.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse.model_validate(lead)


@router.post("", response_model=LeadResponse, status_code=201)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member")),
):
    lead = Lead(**data.model_dump(), organization_id=org.id)
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    # Create version for creation
    await VersionHistoryService.create_lead_version(
        db=db,
        lead=lead,
        change_description="Lead created",
        changed_by=current_user.id,
    )
    return LeadResponse.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member")),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.organization_id == org.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, key, value)
    await db.flush()
    # Create version for update
    await VersionHistoryService.create_lead_version(
        db=db,
        lead=lead,
        change_description="Lead updated",
        changed_by=current_user.id,
    )
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.organization_id == org.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Create version for deletion
    await VersionHistoryService.create_lead_version(
        db=db,
        lead=lead,
        change_description="Lead deleted",
        changed_by=current_user.id,
    )
    await db.delete(lead)


@router.post("/{lead_id}/approve-outreach", response_model=LeadResponse)
async def approve_outreach(
    lead_id: UUID,
    data: LeadApproveOutreach,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member")),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.organization_id == org.id)
    )
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
    # Create version for outreach approval
    await VersionHistoryService.create_lead_version(
        db=db,
        lead=lead,
        change_description="Outreach approved",
        changed_by=current_user.id,
    )
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


class LeadVersionResponse(BaseModel):
    id: UUID
    lead_id: UUID
    version_number: int
    changed_at: datetime
    changed_by: Optional[UUID]
    snapshot: dict
    change_description: Optional[str]


@router.get("/leads/{lead_id}/versions", response_model=list[LeadVersionResponse])
async def get_lead_versions(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    # Ensure lead belongs to org
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == org.id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    versions = await VersionHistoryService.get_lead_versions(db, int(lead_id))
    # Convert to response models
    return [
        LeadVersionResponse(
            id=v.id,
            lead_id=v.lead_id,
            version_number=v.version_number,
            changed_at=v.changed_at,
            changed_by=v.changed_by,
            snapshot=v.snapshot,
            change_description=v.change_description,
        )
        for v in versions
    ]


@router.get("/versions/{version_id}", response_model=LeadVersionResponse)
async def get_version(
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member", "viewer")),
):
    result = await db.execute(
        select(LeadVersion)
        .join(Lead, LeadVersion.lead_id == Lead.id)
        .where(LeadVersion.id == version_id, Lead.organization_id == org.id)
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found or access denied")
    return LeadVersionResponse(
        id=version.id,
        lead_id=version.lead_id,
        version_number=version.version_number,
        changed_at=version.changed_at,
        changed_by=version.changed_by,
        snapshot=version.snapshot,
        change_description=version.change_description,
    )


class BulkActionRequest(BaseModel):
    lead_ids: list[UUID]
    action: str  # "approve", "disqualify", "reanalyze"
    channel: Optional[str] = None


@router.post("/bulk", response_model=dict)
async def bulk_lead_action(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_organization),
    _: None = Depends(require_role("admin", "member")),
):
    result = await db.execute(
        select(Lead).where(
            Lead.id.in_(data.lead_ids),
            Lead.organization_id == org.id,
        )
    )
    leads = result.scalars().all()
    updated = 0

    for lead in leads:
        if data.action == "approve":
            lead.outreach_approved = True
            lead.status = LeadStatus.APPROVED
            await VersionHistoryService.create_lead_version(
                db=db,
                lead=lead,
                change_description="Lead approved via bulk action",
                changed_by=current_user.id,
            )
            updated += 1
        elif data.action == "disqualify":
            lead.status = LeadStatus.DISQUALIFIED
            lead.category_flag = LeadCategory.COLD
            await VersionHistoryService.create_lead_version(
                db=db,
                lead=lead,
                change_description="Lead disqualified via bulk action",
                changed_by=current_user.id,
            )
            updated += 1
        elif data.action == "reanalyze":
            from app.workers.intelligence_tasks import run_full_intelligence_task
            from app.services.job_engine import JobEngine
            await JobEngine.start(
                db=db,
                task_func=run_full_intelligence_task,
                name=f"Reanalyze: {lead.business_name}",
                org_id=org.id,
                lead_id=lead.id,
                args=(str(lead.id),),
            )
            updated += 1

    if updated > 0:
        await db.flush()

    return {
        "action": data.action,
        "requested": len(data.lead_ids),
        "found": len(leads),
        "updated": updated,
    }
