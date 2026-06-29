import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, Integer, Float, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.database import Base


class ExecutionTarget(str, enum.Enum):
    CLOUD = "cloud"
    BROWSER = "browser"
    DESKTOP = "desktop"
    EDGE = "edge"
    HYBRID = "hybrid"


class Capability(Base):
    __tablename__ = "capabilities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("store_products.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    capability_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    input_schema: Mapped[dict] = mapped_column(JSON, default=dict, nullable=True)
    output_schema: Mapped[dict] = mapped_column(JSON, default=dict, nullable=True)
    execution_target: Mapped[ExecutionTarget] = mapped_column(
        Enum(ExecutionTarget, name="execution_target_enum", create_constraint=True),
        default=ExecutionTarget.CLOUD, nullable=False
    )
    execution_timeout: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    execution_resources: Mapped[list] = mapped_column(JSON, default=list, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
