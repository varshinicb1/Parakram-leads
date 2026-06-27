from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class OrganizationCreate(BaseModel):
    name: str
    slug: str


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[dict] = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    subscription_tier: str
    is_active: bool
    max_users: int
    max_leads: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TeamResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberInvite(BaseModel):
    email: str
    role: str = "member"


class MemberResponse(BaseModel):
    user_id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    joined_at: datetime

    model_config = {"from_attributes": True}


class SwitchOrganizationResponse(BaseModel):
    organization_id: UUID
    organization_name: str
    role: str
