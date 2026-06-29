"""Job Engine — wraps Celery tasks with persistent Job tracking.

Provides a universal state machine for all async work:
  PENDING → QUEUED → RUNNING → COMPLETED
                          → FAILED
                          → CANCELLED

Usage:
    from app.services.job_engine import JobEngine

    # Fire a task and track it
    job = await JobEngine.start(
        db=db,
        task_func=analyze_lead_task,
        name="Analyze Lead",
        org_id=org_id,
        lead_id=lead_id,
        args=(lead_id,),
    )

    # Inside the Celery task, update progress:
    JobEngine.update(job_id, status="RUNNING", progress=50)
    JobEngine.complete(job_id, result={"score": 95})
    JobEngine.fail(job_id, error="Something went wrong")
"""

import uuid
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_factory
from app.models.job import Job, JobStatus

logger = logging.getLogger(__name__)


class JobEngine:

    @staticmethod
    async def start(
        db: AsyncSession,
        task_func,
        name: str,
        org_id: uuid.UUID = None,
        lead_id: uuid.UUID = None,
        args: tuple = (),
        kwargs: dict = None,
    ) -> Job:
        """Create a Job record and dispatch the Celery task.

        Returns the Job (already flushed) so callers can read job.id immediately.
        """
        kwargs = kwargs or {}
        task_kwargs = {"args": args, "kwargs": kwargs} if kwargs else {"args": args}

        job = Job(
            organization_id=org_id,
            lead_id=lead_id,
            name=name,
            task_name=task_func.name,
            status=JobStatus.QUEUED,
            payload=task_kwargs,
            queued_at=datetime.utcnow(),
        )
        db.add(job)
        await db.flush()
        await db.refresh(job)

        # Fire the Celery task
        celery_task = task_func.delay(*args, **kwargs)
        job.celery_task_id = celery_task.id
        await db.flush()
        await db.refresh(job)

        logger.info("Job %s started: %s [celery_task=%s]", job.id, name, celery_task.id)
        return job

    @staticmethod
    def _run_async(coro):
        """Run an async coroutine from a sync context."""
        import asyncio
        try:
            asyncio.get_running_loop()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(coro)
            finally:
                loop.close()
        except RuntimeError:
            return asyncio.run(coro)

    @staticmethod
    def update_sync(job_id: str, status: str = None, progress: float = None, error: str = None):
        """Synchronous version of update() — for use inside Celery tasks."""
        return JobEngine._run_async(
            JobEngine._update(job_id, status, progress, error)
        )

    @staticmethod
    def update_by_celery_task_id_sync(
        celery_task_id: str,
        status: str = None,
        progress: float = None,
        error: str = None,
    ):
        """Find a Job by Celery task ID and update it — all from sync context."""
        return JobEngine._run_async(
            JobEngine._update_by_celery_task_id(celery_task_id, status, progress, error)
        )

    @staticmethod
    async def _update_by_celery_task_id(
        celery_task_id: str,
        status: str = None,
        progress: float = None,
        error: str = None,
    ):
        """Internal: find Job by celery_task_id and update it."""
        async with async_session_factory() as db:
            job = await JobEngine.get_by_celery_task_id(db, celery_task_id)
            if not job:
                logger.warning(
                    "No Job found for celery_task_id %s", celery_task_id
                )
                return
            await JobEngine._do_update(db, str(job.id), status, progress, error)

    @staticmethod
    async def update(
        db: AsyncSession, job_id: str,
        status: str = None, progress: float = None, error: str = None,
    ):
        """Update job status/progress within an existing DB session (async context)."""
        await JobEngine._update(job_id, status, progress, error, db=db)

    @staticmethod
    async def _update(
        job_id: str, status: str = None, progress: float = None,
        error: str = None, db: AsyncSession = None,
    ):
        """Internal: update a job record."""
        own_session = db is None
        if own_session:
            async with async_session_factory() as session:
                await JobEngine._do_update(session, job_id, status, progress, error)
        else:
            await JobEngine._do_update(db, job_id, status, progress, error)

    @staticmethod
    async def _do_update(db, job_id, status, progress, error):
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            logger.warning("Job %s not found for status update", job_id)
            return

        if status:
            job.status = JobStatus(status)
        if progress is not None:
            job.progress = min(max(progress, 0.0), 100.0)
        if error:
            job.error = error

        now = datetime.utcnow()
        if job.status == JobStatus.RUNNING and not job.started_at:
            job.started_at = now
        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
            job.completed_at = now

        job.updated_at = now
        await db.flush()

    @staticmethod
    async def complete(db: AsyncSession, job_id: str, result: dict = None):
        """Mark a job as completed with an optional result payload."""
        await JobEngine.update(db, job_id, status=JobStatus.COMPLETED)
        if result is not None:
            r = await db.execute(select(Job).where(Job.id == job_id))
            job = r.scalar_one_or_none()
            if job:
                job.result = result
                await db.flush()

    @staticmethod
    async def fail(db: AsyncSession, job_id: str, error: str = None):
        """Mark a job as failed with an optional error message."""
        await JobEngine.update(db, job_id, status=JobStatus.FAILED, error=error)

    @staticmethod
    async def cancel(db: AsyncSession, job_id: str):
        """Mark a job as cancelled."""
        await JobEngine.update(db, job_id, status=JobStatus.CANCELLED)

    @staticmethod
    async def get(db: AsyncSession, job_id: str) -> Job | None:
        """Get a job by ID."""
        result = await db.execute(select(Job).where(Job.id == job_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_celery_task_id(db: AsyncSession, celery_task_id: str) -> Job | None:
        """Find a Job by its Celery task ID."""
        result = await db.execute(
            select(Job).where(Job.celery_task_id == celery_task_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list(
        db: AsyncSession,
        organization_id: uuid.UUID = None,
        lead_id: uuid.UUID = None,
        status: JobStatus = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Job]:
        """List jobs with optional filters. Ordered by most recent first."""
        query = select(Job)
        if organization_id:
            query = query.where(Job.organization_id == organization_id)
        if lead_id:
            query = query.where(Job.lead_id == lead_id)
        if status:
            query = query.where(Job.status == status)
        query = query.order_by(Job.created_at.desc()).limit(limit).offset(offset)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def stats(
        db: AsyncSession,
        organization_id: uuid.UUID = None,
    ) -> dict:
        """Get job statistics (counts by status)."""
        from sqlalchemy import func

        query = select(Job.status, func.count(Job.id))
        if organization_id:
            query = query.where(Job.organization_id == organization_id)
        query = query.group_by(Job.status)

        result = await db.execute(query)
        rows = result.all()

        counts = {s: 0 for s in JobStatus}
        for status, count in rows:
            counts[JobStatus(status)] = count
        return {k.value: v for k, v in counts.items()}
