"""Celery tasks for the Parakram Growth Agent — runs autonomously on a schedule."""

import logging
from app.workers.celery_app import celery_app, run_async
from app.services.job_engine import JobEngine
from agents.parakram_growth_agent import run_acquisition_cycle

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, soft_time_limit=600, time_limit=660)
def run_growth_agent_cycle(self, location: str = "Bangalore", max_leads: int = 30):
    """Run one acquisition cycle for Parakram's own customer growth."""
    try:
        JobEngine.update_by_celery_task_id_sync(
            self.request.id, status="RUNNING", progress=10
        )
        result = run_async(run_acquisition_cycle(location=location, max_leads=max_leads))
        JobEngine.update_by_celery_task_id_sync(
            self.request.id, status="COMPLETED", progress=100
        )
        logger.info(f"Growth agent cycle complete: {result}")
        return result
    except Exception as exc:
        logger.error(f"Growth agent cycle failed: {exc}")
        JobEngine.update_by_celery_task_id_sync(
            self.request.id, status="FAILED", error=str(exc)
        )
        raise self.retry(exc=exc, countdown=300)
