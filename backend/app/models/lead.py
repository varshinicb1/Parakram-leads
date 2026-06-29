import uuid
from datetime import datetime
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, JSON, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class LeadCategory(str, enum.Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


class LeadStatus(str, enum.Enum):
    DISCOVERED = "discovered"
    ANALYZED = "analyzed"
    APPROVED = "approved"
    CONTACTED = "contacted"
    RESPONDED = "responded"
    MEETING_SCHEDULED = "meeting_scheduled"
    CONVERTED = "converted"
    DISQUALIFIED = "disqualified"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    business_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    owner_name: Mapped[str] = mapped_column(String(255), nullable=True)
    industry: Mapped[str] = mapped_column(String(128), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(128), nullable=True)
    website_url: Mapped[str] = mapped_column(String(512), nullable=True)
    phone: Mapped[str] = mapped_column(String(64), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    social_profiles: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    business_description: Mapped[str] = mapped_column(Text, nullable=True)
    business_size_estimate: Mapped[str] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(64), nullable=True, index=True)

    digital_maturity_score: Mapped[float] = mapped_column(Float, default=0.0)
    opportunity_score: Mapped[float] = mapped_column(Float, default=0.0)
    category_flag: Mapped[str] = mapped_column(SAEnum(LeadCategory), default=LeadCategory.COLD)
    status: Mapped[str] = mapped_column(SAEnum(LeadStatus), default=LeadStatus.DISCOVERED)

    website_exists: Mapped[bool] = mapped_column(Boolean, default=False)
    website_quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    mobile_responsive: Mapped[bool] = mapped_column(Boolean, default=False)
    ssl_present: Mapped[bool] = mapped_column(Boolean, default=False)
    has_booking_system: Mapped[bool] = mapped_column(Boolean, default=False)
    has_lead_form: Mapped[bool] = mapped_column(Boolean, default=False)
    has_crm_indicators: Mapped[bool] = mapped_column(Boolean, default=False)
    has_analytics: Mapped[bool] = mapped_column(Boolean, default=False)
    has_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    gbp_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    social_media_active: Mapped[bool] = mapped_column(Boolean, default=False)
    email_domain_quality: Mapped[float] = mapped_column(Float, default=0.0)

    estimated_needs: Mapped[dict] = mapped_column(JSON, nullable=True, default=list)
    ai_analysis: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    suggested_solution: Mapped[str] = mapped_column(Text, nullable=True)
    estimated_project_value: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_outreach: Mapped[str] = mapped_column(Text, nullable=True)

    outreach_message_whatsapp: Mapped[str] = mapped_column(Text, nullable=True)
    outreach_message_email: Mapped[str] = mapped_column(Text, nullable=True)
    outreach_message_linkedin: Mapped[str] = mapped_column(Text, nullable=True)
    outreach_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    outreach_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    outreach_sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    last_contacted: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    response_received: Mapped[bool] = mapped_column(Boolean, default=False)
    response_text: Mapped[str] = mapped_column(Text, nullable=True)
    response_received_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # GDPR & Data Retention
    gdpr_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    gdpr_consent_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    soft_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    soft_deleted_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Predictive Intelligence Fields (computed by the engine, stored for queries)
    predictive_quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    conversion_probability: Mapped[float] = mapped_column(Float, default=0.0)
    buying_urgency: Mapped[float] = mapped_column(Float, default=0.0)
    optimal_channel: Mapped[str] = mapped_column(String(32), nullable=True)
    recommended_sequence_length: Mapped[int] = mapped_column(Integer, default=3)
    last_intelligence_update: Mapped[datetime] = mapped_column(DateTime, nullable=True)
