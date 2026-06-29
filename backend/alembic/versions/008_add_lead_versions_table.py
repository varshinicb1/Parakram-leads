"""add lead versions table

Revision ID: 008
Revises: 007
Create Date: 2026-06-30 13:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "008"
down_revision: Union[str, Sequence[str], None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lead_versions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("lead_id", UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("version_number", sa.Integer, nullable=False),
        sa.Column("changed_at", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column("changed_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("snapshot", JSONB, nullable=False),
        sa.Column("change_description", sa.Text, nullable=True),
        sa.UniqueConstraint("lead_id", "version_number", name="uq_lead_version_number"),
    )


def downgrade() -> None:
    op.drop_table("lead_versions")