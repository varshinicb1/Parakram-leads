from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.lead import Lead, LeadVersion
from typing import Optional
import json

class VersionHistoryService:
    @staticmethod
    def _create_snapshot(lead: Lead) -> dict:
        """Create a snapshot of the lead's mutable fields."""
        # Get mapper to inspect columns
        from sqlalchemy import inspect
        mapper = inspect(lead)
        data = {}
        for column in mapper.columns:
            value = getattr(lead, column.key)
            # Convert datetime/date to ISO string for JSON serialization
            if hasattr(value, 'isoformat'):
                value = value.isoformat()
            elif isinstance(value, (list, dict)):
                # Already JSON serializable
                pass
            elif isinstance(value, (int, float, str, bool)) or value is None:
                pass
            else:
                # For other types (like UUID), convert to string
                value = str(value)
            data[column.key] = value
        return data

    @staticmethod
    async def create_lead_version(
        db: AsyncSession,
        lead: Lead,
        change_description: str,
        changed_by: Optional[int] = None,
    ) -> LeadVersion:
        """
        Create a new version record for the given lead.
        """
        snapshot = VersionHistoryService._create_snapshot(lead)
        # Determine next version number
        result = await db.execute(
            select(LeadVersion)
            .where(LeadVersion.lead_id == lead.id)
            .order_by(LeadVersion.version_number.desc())
            .limit(1)
        )
        max_version = result.scalar_one_or_none()
        next_version = (max_version.version_number + 1) if max_version else 1
        version_record = LeadVersion(
            lead_id=lead.id,
            version_number=next_version,
            snapshot=snapshot,
            changed_at=lead.updated_at or lead.created_at,  # Use the lead's timestamp
            changed_by=changed_by,
            change_description=change_description,
        )
        db.add(version_record)
        await db.commit()
        await db.refresh(version_record)
        return version_record

    @staticmethod
    async def get_lead_versions(db: AsyncSession, lead_id: int):
        """Return all versions for a lead, ordered by version_number ascending."""
        result = await db.execute(
            select(LeadVersion)
            .where(LeadVersion.lead_id == lead_id)
            .order_by(LeadVersion.version_number.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_lead_version(db: AsyncSession, version_id: int):
        """Get a specific version by its ID."""
        result = await db.execute(select(LeadVersion).where(LeadVersion.id == version_id))
        return result.scalar_one_or_none()