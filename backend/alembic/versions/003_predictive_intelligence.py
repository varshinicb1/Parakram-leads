"""add predictive intelligence fields to leads

Revision ID: 003
Revises: 002
Create Date: 2026-06-28 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("predictive_quality_score", sa.Float(), server_default="0.0", nullable=False))
    op.add_column("leads", sa.Column("conversion_probability", sa.Float(), server_default="0.0", nullable=False))
    op.add_column("leads", sa.Column("buying_urgency", sa.Float(), server_default="0.0", nullable=False))
    op.add_column("leads", sa.Column("optimal_channel", sa.String(32), nullable=True))
    op.add_column("leads", sa.Column("recommended_sequence_length", sa.Integer(), server_default="3", nullable=False))
    op.add_column("leads", sa.Column("last_intelligence_update", sa.DateTime(), nullable=True))
    op.create_index("ix_leads_predictive_quality", "leads", ["predictive_quality_score"])
    op.create_index("ix_leads_buying_urgency", "leads", ["buying_urgency"])


def downgrade() -> None:
    op.drop_index("ix_leads_buying_urgency")
    op.drop_index("ix_leads_predictive_quality")
    op.drop_column("leads", "last_intelligence_update")
    op.drop_column("leads", "recommended_sequence_length")
    op.drop_column("leads", "optimal_channel")
    op.drop_column("leads", "buying_urgency")
    op.drop_column("leads", "conversion_probability")
    op.drop_column("leads", "predictive_quality_score")
