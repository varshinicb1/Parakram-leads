import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class MessageChannel(str, enum.Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"


class MessageStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    REPLIED = "replied"
    FAILED = "failed"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(SAEnum(MessageChannel), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(MessageStatus), default=MessageStatus.DRAFT)
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    replied_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    reply_content: Mapped[str] = mapped_column(Text, nullable=True)
    external_id: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
