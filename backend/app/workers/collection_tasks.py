from app.workers.celery_app import celery_app, run_async
from app.database import async_session_factory
from app.models.lead import Lead, LeadStatus, LeadCategory
from app.services.scorer import compute_scores
from app.services.ai_analyzer import analyze_lead
from app.services.prioritizer import categorize_lead
from app.services.outreach_generator import generate_outreach
from app.services.job_engine import JobEngine
from sqlalchemy import select


@celery_app.task(bind=True, max_retries=3)
def analyze_lead_task(self, lead_id: str):
    async def _run():
        async with async_session_factory() as db:
            job = await JobEngine.get_by_celery_task_id(db, self.request.id)

            result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead:
                if job:
                    await JobEngine.fail(db, str(job.id), error="Lead not found")
                return {"error": "Lead not found"}

            if job:
                await JobEngine.update(db, str(job.id), status="RUNNING", progress=10)

            dm_score, opp_score = await compute_scores(lead)
            lead.digital_maturity_score = dm_score
            lead.opportunity_score = opp_score

            if job:
                await JobEngine.update(db, str(job.id), progress=30)

            analysis = await analyze_lead(lead)
            lead.ai_analysis = analysis
            lead.suggested_solution = analysis.get("suggested_solution", "")
            lead.estimated_project_value = analysis.get("estimated_project_value", 0)
            lead.estimated_needs = analysis.get("estimated_needs", [])
            lead.recommended_outreach = analysis.get("recommended_outreach", "")

            if job:
                await JobEngine.update(db, str(job.id), progress=60)

            category = await categorize_lead(lead)
            lead.category_flag = category
            lead.status = LeadStatus.ANALYZED

            outreach = await generate_outreach(lead)
            lead.outreach_message_whatsapp = outreach.get("whatsapp", "")
            lead.outreach_message_email = outreach.get("email", "")
            lead.outreach_message_linkedin = outreach.get("linkedin", "")

            await db.flush()
            await db.refresh(lead)

            result = {
                "lead_id": str(lead.id),
                "digital_maturity_score": dm_score,
                "opportunity_score": opp_score,
                "category": category,
                "estimated_project_value": lead.estimated_project_value,
            }

            if job:
                await JobEngine.complete(db, str(job.id), result=result)
            return result

    return run_async(_run())


@celery_app.task(bind=True, max_retries=3)
def batch_analyze_leads_task(self, limit: int = 50):
    async def _run():
        async with async_session_factory() as db:
            job = await JobEngine.get_by_celery_task_id(db, self.request.id)

            result = await db.execute(
                select(Lead).where(Lead.status == LeadStatus.DISCOVERED)
                .order_by(Lead.created_at.asc())
                .limit(limit)
            )
            leads = result.scalars().all()
            total = len(leads)

            if job:
                await JobEngine.update(
                    db, str(job.id), status="RUNNING",
                    progress=0,
                )

            processed = []
            for i, lead in enumerate(leads):
                child_job = await JobEngine.start(
                    db=db,
                    task_func=analyze_lead_task,
                    name=f"Analyze: {lead.business_name}",
                    org_id=lead.organization_id,
                    lead_id=lead.id,
                    args=(str(lead.id),),
                )
                processed.append({
                    "lead_id": str(lead.id),
                    "job_id": str(child_job.id),
                    "task_id": child_job.celery_task_id,
                })
                if job:
                    pct = int((i + 1) / total * 100) if total > 0 else 100
                    await JobEngine.update(db, str(job.id), progress=pct)

            result = {"processed": len(processed), "tasks": processed}
            if job:
                await JobEngine.complete(db, str(job.id), result=result)
            return result

    return run_async(_run())
