"""Job Engine API — track and inspect async work across the platform."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.job import Job, JobStatus
from app.services.job_engine import JobEngine
from app.utils.security import get_current_user
import uuid

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def _job_to_dict(job: Job) -> dict:
    return {
        "id": str(job.id),
        "organization_id": str(job.organization_id) if job.organization_id else None,
        "lead_id": str(job.lead_id) if job.lead_id else None,
        "name": job.name,
        "task_name": job.task_name,
        "celery_task_id": job.celery_task_id,
        "status": job.status.value,
        "progress": job.progress,
        "error": job.error,
        "queued_at": job.queued_at.isoformat() if job.queued_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.get("/{job_id}")
async def get_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get status and result of a specific job."""
    job = await JobEngine.get(db, str(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_dict(job)


@router.get("")
async def list_jobs(
    organization_id: uuid.UUID = Query(None),
    lead_id: uuid.UUID = Query(None),
    status: str = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """List jobs with optional filters."""
    status_enum = JobStatus(status.upper()) if status else None
    jobs = await JobEngine.list(
        db,
        organization_id=organization_id,
        lead_id=lead_id,
        status=status_enum,
        limit=limit,
        offset=offset,
    )
    return {
        "jobs": [_job_to_dict(j) for j in jobs],
        "count": len(jobs),
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def job_stats(
    organization_id: uuid.UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get job statistics grouped by status."""
    return await JobEngine.stats(db, organization_id=organization_id)
