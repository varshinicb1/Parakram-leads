from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


class LeadCreate(BaseModel):
    business_name: str
    owner_name: Optional[str] = None
    industry: Optional[str] = None
    category: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    business_description: Optional[str] = None
    source: Optional[str] = None


class LeadUpdate(BaseModel):
    owner_name: Optional[str] = None
    industry: Optional[str] = None
    category: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    social_profiles: Optional[dict] = None
    review_count: Optional[int] = None
    rating: Optional[float] = None
    location: Optional[str] = None
    business_description: Optional[str] = None
    business_size_estimate: Optional[str] = None


class LeadResponse(BaseModel):
    id: UUID
    business_name: str
    owner_name: Optional[str] = None
    industry: Optional[str] = None
    category: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    social_profiles: Optional[dict] = None
    review_count: int
    rating: float
    location: Optional[str] = None
    business_description: Optional[str] = None
    business_size_estimate: Optional[str] = None
    source: Optional[str] = None
    digital_maturity_score: float
    opportunity_score: float
    category_flag: str
    status: str
    estimated_needs: Optional[list] = None
    ai_analysis: Optional[dict] = None
    suggested_solution: Optional[str] = None
    estimated_project_value: float
    recommended_outreach: Optional[str] = None
    outreach_approved: bool
    outreach_sent: bool
    response_received: bool
    response_text: Optional[str] = None
    # Predictive Intelligence
    predictive_quality_score: float = 0.0
    conversion_probability: float = 0.0
    buying_urgency: float = 0.0
    optimal_channel: Optional[str] = None
    recommended_sequence_length: int = 3
    last_intelligence_update: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadListResponse(BaseModel):
    total: int
    hot: int
    warm: int
    cold: int
    leads: list[LeadResponse]


class LeadApproveOutreach(BaseModel):
    whatsapp_message: Optional[str] = None
    email_message: Optional[str] = None
    linkedin_message: Optional[str] = None
