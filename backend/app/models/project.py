import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import String, Text, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint, Enum as SAEnum, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(ProjectStatus, values_callable=lambda obj: [e.value for e in obj]),
        default="active",
        server_default=text("'active'"),
        nullable=False
    )
    settings: Mapped[dict] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow,
    )

    def __init__(self, **kwargs: Any):
        super().__init__(**kwargs)
        if self.status is None:
            self.status = ProjectStatus.ACTIVE

    organization = relationship("Organization", back_populates="projects")
    user_projects = relationship("UserProject", back_populates="project", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_org_project_slug"),
    )