"""add capabilities table for Capability Registry

Revision ID: 006
Revises: 005
Create Date: 2026-06-30 11:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "capabilities",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "product_id", UUID(as_uuid=True),
            sa.ForeignKey("store_products.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column(
            "organization_id", UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column("capability_id", sa.String(128), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("input_schema", JSON, nullable=True),
        sa.Column("output_schema", JSON, nullable=True),
        sa.Column(
            "execution_target",
            sa.Enum("cloud", "browser", "desktop", "edge", "hybrid",
                    name="execution_target_enum", create_constraint=True),
            nullable=False, default="cloud",
        ),
        sa.Column("execution_timeout", sa.Integer, nullable=False, default=300),
        sa.Column("execution_resources", JSON, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("capabilities")
    op.execute("DROP TYPE IF EXISTS execution_target_enum")
