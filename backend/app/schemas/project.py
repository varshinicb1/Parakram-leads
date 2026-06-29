from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    settings: Optional[dict] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[dict] = None


class ProjectResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    status: str
    settings: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
