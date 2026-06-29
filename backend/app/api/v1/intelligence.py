"""
Intelligence API — exposes predictive scoring, sequence engine, response analysis,
and lead enrichment through a single unified endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.lead import Lead, LeadCategory, LeadStatus
from app.services.predictive_scorer import compute_predictive_score
from app.services.sequence_engine import build_sequence, generate_sequence_message
from app.services.response_intelligence import analyze_response
from app.services.lead_enrichment import enrich_lead
from app.services.buying_signals import detect_buying_signals, should_prioritize
from app.utils.security import get_current_user
from app.workers.intelligence_tasks import (
    run_full_intelligence_task,
    detect_buying_signals_task,
    reanalyze_all_leads_task,
)
from app.workers.outreach_tasks import send_outreach_task
from app.workers.linkedin_tasks import send_linkedin_message_task
from app.services.job_engine import JobEngine
import uuid

router = APIRouter(prefix="/api/v1/intelligence", tags=["intelligence"])


@router.get("/predict/{lead_id}")
async def get_lead_intelligence(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get complete predictive intelligence for a lead."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    prediction = await compute_predictive_score(lead)
    return {
        "lead_id": str(lead.id),
        "business_name": lead.business_name,
        "prediction": prediction,
    }


@router.get("/sequence/{lead_id}")
async def get_lead_sequence(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get the optimal outreach sequence for a lead."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    sequence = await build_sequence(lead)
    return {
        "lead_id": str(lead.id),
        "business_name": lead.business_name,
        "sequence": sequence.to_dict(),
    }


@router.post("/analyze-response")
async def analyze_lead_response(
    data: dict,
    user=Depends(get_current_user),
):
    """Analyze a lead's reply for sentiment and intent."""
    reply_text = data.get("reply_text", "")
    lead_name = data.get("lead_name", "")
    if not reply_text:
        raise HTTPException(status_code=400, detail="reply_text is required")

    analysis = await analyze_response(reply_text, lead_name)
    return analysis


@router.get("/enrich/{lead_id}")
async def enrich_lead_data(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Enrich a lead with data from multiple sources."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    enrichment = await enrich_lead(lead)
    return {
        "lead_id": str(lead.id),
        "business_name": lead.business_name,
        "enrichment": enrichment,
    }


@router.get("/full/{lead_id}")
async def get_full_intelligence(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get everything — prediction + sequence + enrichment + signals in one call."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    prediction = await compute_predictive_score(lead)
    sequence = await build_sequence(lead)
    enrichment = await enrich_lead(lead)
    signals = await detect_buying_signals(lead)

    return {
        "lead_id": str(lead.id),
        "business_name": lead.business_name,
        "prediction": prediction,
        "sequence": sequence.to_dict(),
        "enrichment": enrichment,
        "buying_signals": signals,
    }


@router.post("/prioritize-batch")
async def prioritize_leads_batch(
    data: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Score and prioritize multiple leads at once for bulk operations."""
    lead_ids = data.get("lead_ids", [])
    if not lead_ids:
        raise HTTPException(status_code=400, detail="lead_ids required")

    results = []
    for lid in lead_ids:
        try:
            uid = uuid.UUID(lid) if isinstance(lid, str) else lid
            lead = await db.get(Lead, uid)
            if lead:
                pred = await compute_predictive_score(lead)
                results.append({
                    "lead_id": str(lead.id),
                    "business_name": lead.business_name,
                    "overall_quality": pred["overall_quality"],
                    "conversion_probability": pred["conversion_probability"],
                    "urgency": pred["urgency"],
                    "urgency_label": pred["urgency_label"],
                    "optimal_channel": pred["optimal_channel"],
                })
        except Exception:
            continue

    results.sort(key=lambda x: x["overall_quality"], reverse=True)
    return {"leads_scored": len(results), "prioritized_leads": results}


@router.post("/analyze/{lead_id}")
async def trigger_lead_analysis(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Trigger full intelligence pipeline for a lead via Celery worker."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    job = await JobEngine.start(
        db=db,
        task_func=run_full_intelligence_task,
        name=f"Full Intelligence Scan: {lead.business_name}",
        org_id=lead.organization_id,
        lead_id=lead.id,
        args=(str(lead.id),),
    )
    return {
        "lead_id": str(lead.id),
        "business_name": lead.business_name,
        "job_id": str(job.id),
        "task_id": job.celery_task_id,
        "status": "queued",
    }


@router.get("/alerts")
async def get_intelligence_alerts(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get recent high-urgency leads and intelligence alerts."""
    from app.models.alert import Alert
    from sqlalchemy import select, desc

    alerts_query = (
        select(Alert)
        .where(Alert.alert_type == "buying_urgency")
        .order_by(desc(Alert.created_at))
        .limit(limit)
    )
    alerts_result = await db.execute(alerts_query)
    alerts = alerts_result.scalars().all()

    urgent_leads_query = (
        select(Lead)
        .where(Lead.buying_urgency >= 70)
        .order_by(desc(Lead.buying_urgency), desc(Lead.last_intelligence_update))
        .limit(limit)
    )
    urgent_result = await db.execute(urgent_leads_query)
    urgent_leads = urgent_result.scalars().all()

    return {
        "alerts": [
            {
                "id": str(a.id),
                "lead_id": str(a.lead_id) if a.lead_id else None,
                "message": a.message,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
        "urgent_leads": [
            {
                "id": str(l.id),
                "business_name": l.business_name,
                "buying_urgency": l.buying_urgency,
                "predictive_quality_score": l.predictive_quality_score,
                "optimal_channel": l.optimal_channel or "email",
                "category_flag": l.category_flag,
            }
            for l in urgent_leads
        ],
        "total_urgent": len(urgent_leads),
    }


@router.post("/send-linkedin/{lead_id}")
async def trigger_linkedin_send(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Trigger LinkedIn message sending via Celery worker."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    social_profiles = lead.social_profiles or {}
    linkedin_url = social_profiles.get("linkedin", "")
    if not linkedin_url:
        raise HTTPException(status_code=400, detail="No LinkedIn URL found for this lead")

    if not lead.outreach_message_linkedin:
        raise HTTPException(status_code=400, detail="No LinkedIn outreach message generated")

    if not lead.outreach_approved:
        raise HTTPException(status_code=400, detail="Outreach not approved. Approve before sending.")

    job = await JobEngine.start(
        db=db,
        task_func=send_linkedin_message_task,
        name=f"Send LinkedIn: {lead.business_name}",
        org_id=lead.organization_id,
        lead_id=lead.id,
        args=(str(lead.id),),
    )
    return {
        "lead_id": str(lead.id),
        "business_name": lead.business_name,
        "linkedin_url": linkedin_url,
        "job_id": str(job.id),
        "task_id": job.celery_task_id,
        "status": "queued",
    }
