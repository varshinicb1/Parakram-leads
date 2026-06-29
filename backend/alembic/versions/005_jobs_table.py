"""add jobs table for universal Job Engine

Revision ID: 005
Revises: 004
Create Date: 2026-06-30 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=True, index=True
        ),
        sa.Column("lead_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("task_name", sa.String(255), nullable=False),
        sa.Column("celery_task_id", sa.String(255), nullable=True, index=True),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING", "QUEUED", "RUNNING", "COMPLETED",
                "FAILED", "CANCELLED",
                name="job_status_enum", create_constraint=True,
            ),
            nullable=False, default="PENDING", index=True,
        ),
        sa.Column("progress", sa.Float, nullable=False, default=0.0),
        sa.Column("payload", JSON, nullable=True),
        sa.Column("result", JSON, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("queued_at", sa.DateTime, nullable=True),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.execute("DROP TYPE IF EXISTS job_status_enum")
