from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class MessageResponse(BaseModel):
    id: UUID
    lead_id: UUID
    channel: str
    content: str
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    reply_content: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardResponse(BaseModel):
    total_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    messages_sent: int
    responses: int
    meetings_scheduled: int
    estimated_pipeline_value: float
    conversion_rate: float
    revenue_forecast: float
