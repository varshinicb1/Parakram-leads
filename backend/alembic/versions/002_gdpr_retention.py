"""Add GDPR consent and data retention fields

Revision ID: 002
Revises: 001
Create Date: 2026-06-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('gdpr_consent', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('leads', sa.Column('gdpr_consent_date', sa.DateTime(), nullable=True))
    op.add_column('leads', sa.Column('soft_deleted', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('leads', sa.Column('soft_deleted_at', sa.DateTime(), nullable=True))
    op.add_column('organizations', sa.Column('data_retention_days', sa.Integer(), nullable=True, server_default='730'))

    op.create_table(
        'consent_records',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('lead_id', sa.String(), sa.ForeignKey('leads.id'), nullable=True),
        sa.Column('consent_type', sa.String(), nullable=False),
        sa.Column('given_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('method', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_index('ix_leads_gdpr_consent_date', 'leads', ['gdpr_consent_date'])
    op.create_index('ix_leads_soft_deleted', 'leads', ['soft_deleted'])
    op.create_index('ix_consent_records_org', 'consent_records', ['organization_id'])


def downgrade() -> None:
    op.drop_index('ix_consent_records_org')
    op.drop_index('ix_leads_soft_deleted')
    op.drop_index('ix_leads_gdpr_consent_date')
    op.drop_table('consent_records')
    op.drop_column('organizations', 'data_retention_days')
    op.drop_column('leads', 'soft_deleted_at')
    op.drop_column('leads', 'soft_deleted')
    op.drop_column('leads', 'gdpr_consent_date')
    op.drop_column('leads', 'gdpr_consent')
