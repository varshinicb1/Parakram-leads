"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("role", sa.String(32), default="admin"),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )

    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("business_name", sa.String(255), nullable=False, index=True),
        sa.Column("owner_name", sa.String(255)),
        sa.Column("industry", sa.String(128), index=True),
        sa.Column("category", sa.String(128)),
        sa.Column("website_url", sa.String(512)),
        sa.Column("phone", sa.String(64)),
        sa.Column("email", sa.String(255)),
        sa.Column("social_profiles", postgresql.JSON()),
        sa.Column("review_count", sa.Integer(), default=0),
        sa.Column("rating", sa.Float(), default=0.0),
        sa.Column("location", sa.String(255)),
        sa.Column("business_description", sa.Text()),
        sa.Column("business_size_estimate", sa.String(64)),
        sa.Column("source", sa.String(64), index=True),
        sa.Column("digital_maturity_score", sa.Float(), default=0.0),
        sa.Column("opportunity_score", sa.Float(), default=0.0),
        sa.Column("category_flag", sa.String(16), default="cold"),
        sa.Column("status", sa.String(32), default="discovered"),
        sa.Column("website_exists", sa.Boolean(), default=False),
        sa.Column("website_quality_score", sa.Float(), default=0.0),
        sa.Column("mobile_responsive", sa.Boolean(), default=False),
        sa.Column("ssl_present", sa.Boolean(), default=False),
        sa.Column("has_booking_system", sa.Boolean(), default=False),
        sa.Column("has_lead_form", sa.Boolean(), default=False),
        sa.Column("has_crm_indicators", sa.Boolean(), default=False),
        sa.Column("has_analytics", sa.Boolean(), default=False),
        sa.Column("has_whatsapp", sa.Boolean(), default=False),
        sa.Column("gbp_complete", sa.Boolean(), default=False),
        sa.Column("social_media_active", sa.Boolean(), default=False),
        sa.Column("email_domain_quality", sa.Float(), default=0.0),
        sa.Column("estimated_needs", postgresql.JSON()),
        sa.Column("ai_analysis", postgresql.JSON()),
        sa.Column("suggested_solution", sa.Text()),
        sa.Column("estimated_project_value", sa.Float(), default=0.0),
        sa.Column("recommended_outreach", sa.Text()),
        sa.Column("outreach_message_whatsapp", sa.Text()),
        sa.Column("outreach_message_email", sa.Text()),
        sa.Column("outreach_message_linkedin", sa.Text()),
        sa.Column("outreach_approved", sa.Boolean(), default=False),
        sa.Column("outreach_sent", sa.Boolean(), default=False),
        sa.Column("outreach_sent_at", sa.DateTime()),
        sa.Column("last_contacted", sa.DateTime()),
        sa.Column("response_received", sa.Boolean(), default=False),
        sa.Column("response_text", sa.Text()),
        sa.Column("response_received_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("channel", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), default="draft"),
        sa.Column("sent_at", sa.DateTime()),
        sa.Column("delivered_at", sa.DateTime()),
        sa.Column("opened_at", sa.DateTime()),
        sa.Column("replied_at", sa.DateTime()),
        sa.Column("reply_content", sa.Text()),
        sa.Column("external_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True)),
        sa.Column("alert_type", sa.String(64), nullable=False),
        sa.Column("channel", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("sent", sa.Boolean(), default=False),
        sa.Column("sent_at", sa.DateTime()),
        sa.Column("error", sa.Text()),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource", sa.String(128)),
        sa.Column("resource_id", sa.String(64)),
        sa.Column("details", sa.Text()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("alerts")
    op.drop_table("messages")
    op.drop_table("leads")
    op.drop_table("users")
