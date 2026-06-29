"""Data retention enforcement tasks.

Enforces GDPR/data retention policies by soft-deleting or purging
leads that exceed the configured retention period.
"""

import logging
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.lead import Lead
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def enforce_retention_task(self):
    """Soft-delete leads older than DATA_RETENTION_DAYS.

    Runs daily at 3:00 AM via Celery Beat.
    """
    try:
        engine = create_engine(settings.DATABASE_URL_SYNC)
        SessionLocal = sessionmaker(bind=engine)
        cutoff = datetime.utcnow() - timedelta(days=settings.DATA_RETENTION_DAYS)

        with SessionLocal() as db:
            leads_to_purge = (
                db.query(Lead)
                .filter(
                    Lead.created_at < cutoff,
                    Lead.soft_deleted == False,
                )
                .all()
            )

            count = 0
            for lead in leads_to_purge:
                lead.soft_deleted = True
                lead.soft_deleted_at = datetime.utcnow()
                count += 1

            db.commit()
            logger.info("Retention task: soft-deleted %d leads older than %s", count, cutoff)
            return {"status": "completed", "soft_deleted": count}

    except Exception as e:
        logger.error("Retention task failed: %s", e)
        raise self.retry(exc=e)
