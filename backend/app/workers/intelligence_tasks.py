from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.lead import Lead, LeadStatus
from app.services.scorer import compute_scores
from app.services.predictive_scorer import compute_predictive_score
from app.services.buying_signals import detect_buying_signals
from app.services.ai_analyzer import analyze_lead
from sqlalchemy import select
from datetime import datetime
import asyncio


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def run_full_intelligence_task(self, lead_id: str):
    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead:
                return {"error": "Lead not found"}

            dm_score, opp_score = await compute_scores(lead)
            lead.digital_maturity_score = dm_score
            lead.opportunity_score = opp_score

            predictive_result = compute_predictive_score(lead)
            lead.predictive_quality_score = predictive_result["quality_score"]
            lead.conversion_probability = predictive_result["conversion_probability"]
            lead.buying_urgency = predictive_result["buying_urgency"]
            lead.optimal_channel = predictive_result["recommended_channel"]
            lead.recommended_sequence_length = predictive_result["recommended_sequence_length"]
            lead.last_intelligence_update = datetime.utcnow()

            signals = detect_buying_signals(lead)
            analysis = await analyze_lead(lead)
            lead.ai_analysis = analysis
            lead.suggested_solution = analysis.get("suggested_solution", "")
            lead.estimated_project_value = analysis.get("estimated_project_value", 0)
            lead.estimated_needs = analysis.get("estimated_needs", [])

            from app.services.prioritizer import categorize_lead
            category = await categorize_lead(lead)
            lead.category_flag = category
            lead.status = LeadStatus.ANALYZED

            await db.flush()
            await db.refresh(lead)

            return {
                "lead_id": str(lead.id),
                "quality_score": predictive_result["quality_score"],
                "conversion_probability": predictive_result["conversion_probability"],
                "buying_urgency": predictive_result["buying_urgency"],
                "optimal_channel": predictive_result["recommended_channel"],
                "signals": signals,
                "category": category,
            }

    return run_async(_run())


@celery_app.task(bind=True, max_retries=3)
def batch_intelligence_scan_task(self, limit: int = 100):
    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(
                select(Lead).where(
                    Lead.last_intelligence_update.is_(None)
                )
                .order_by(Lead.created_at.asc())
                .limit(limit)
            )
            leads = result.scalars().all()
            processed = []
            for lead in leads:
                task = run_full_intelligence_task.delay(str(lead.id))
                processed.append({"lead_id": str(lead.id), "task_id": task.id})
            return {"processed": len(processed), "tasks": processed}

    return run_async(_run())


@celery_app.task(bind=True, max_retries=3)
def detect_buying_signals_task(self, lead_id: str):
    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead:
                return {"error": "Lead not found"}

            signals_result = detect_buying_signals(lead)
            urgency_score = signals_result.get("combined_urgency", 0)
            lead.buying_urgency = urgency_score

            if urgency_score >= 70:
                from app.models.alert import Alert
                alert = Alert(
                    organization_id=lead.organization_id,
                    lead_id=lead.id,
                    alert_type="buying_urgency",
                    channel="in_app",
                    message=f"High buying urgency detected for {lead.business_name} ({urgency_score}/100)",
                )
                db.add(alert)

            await db.flush()
            await db.refresh(lead)
            return {"lead_id": str(lead.id), "urgency": urgency_score, "signals": signals_result.get("active_signals", [])}

    return run_async(_run())


@celery_app.task(bind=True, max_retries=3)
def reanalyze_all_leads_task(self, organization_id: str = None):
    async def _run():
        async with async_session_factory() as db:
            query = select(Lead)
            if organization_id:
                query = query.where(Lead.organization_id == organization_id)
            query = query.order_by(Lead.created_at.asc())
            result = await db.execute(query)
            leads = result.scalars().all()
            processed = []
            for lead in leads:
                task = run_full_intelligence_task.delay(str(lead.id))
                processed.append({"lead_id": str(lead.id), "task_id": task.id})
            return {"processed": len(processed), "tasks": processed}

    return run_async(_run())
