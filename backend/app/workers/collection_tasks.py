from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.lead import Lead, LeadStatus, LeadCategory
from app.services.scorer import compute_scores
from app.services.ai_analyzer import analyze_lead
from app.services.prioritizer import categorize_lead
from app.services.outreach_generator import generate_outreach
from sqlalchemy import select
import asyncio


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def analyze_lead_task(self, lead_id: str):
    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead:
                return {"error": "Lead not found"}

            dm_score, opp_score = await compute_scores(lead)
            lead.digital_maturity_score = dm_score
            lead.opportunity_score = opp_score

            analysis = await analyze_lead(lead)
            lead.ai_analysis = analysis
            lead.suggested_solution = analysis.get("suggested_solution", "")
            lead.estimated_project_value = analysis.get("estimated_project_value", 0)
            lead.estimated_needs = analysis.get("estimated_needs", [])
            lead.recommended_outreach = analysis.get("recommended_outreach", "")

            category = await categorize_lead(lead)
            lead.category_flag = category
            lead.status = LeadStatus.ANALYZED

            outreach = await generate_outreach(lead)
            lead.outreach_message_whatsapp = outreach.get("whatsapp", "")
            lead.outreach_message_email = outreach.get("email", "")
            lead.outreach_message_linkedin = outreach.get("linkedin", "")

            await db.flush()
            await db.refresh(lead)

            return {
                "lead_id": str(lead.id),
                "digital_maturity_score": dm_score,
                "opportunity_score": opp_score,
                "category": category,
                "estimated_project_value": lead.estimated_project_value,
            }

    return run_async(_run())


@celery_app.task(bind=True, max_retries=3)
def batch_analyze_leads_task(self, limit: int = 50):
    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(
                select(Lead).where(Lead.status == LeadStatus.DISCOVERED)
                .order_by(Lead.created_at.asc())
                .limit(limit)
            )
            leads = result.scalars().all()
            processed = []
            for lead in leads:
                task = analyze_lead_task.delay(str(lead.id))
                processed.append({"lead_id": str(lead.id), "task_id": task.id})
            return {"processed": len(processed), "tasks": processed}

    return run_async(_run())
