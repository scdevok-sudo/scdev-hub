import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProjectMilestone(Base):
    """Hito con fecha de un proyecto, uno de los 4 lugares con calendar_sync
    (Parte E, fase 3), junto a tasks, invoices y client_services."""

    __tablename__ = "project_milestones"
    __table_args__ = (
        CheckConstraint(
            "calendar_sync in ('off', 'manual', 'automatic')", name="project_milestones_calendar_sync_check"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    calendar_sync: Mapped[str | None] = mapped_column(String, server_default="off")
    google_event_id: Mapped[str | None] = mapped_column(String)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", lazy="joined")
