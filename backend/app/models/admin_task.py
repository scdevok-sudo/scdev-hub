import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AdminTask(Base):
    """Pendientes de Santi fuera de cualquier proyecto (Parte C, fase 3).

    Tabla propia, sin checklist ni subtareas -- uso personal, no necesita la
    misma profundidad que el Kanban de proyecto.
    """

    __tablename__ = "admin_tasks"
    __table_args__ = (
        CheckConstraint("status in ('todo', 'in_progress', 'done')", name="admin_tasks_status_check"),
        CheckConstraint("priority in ('low', 'medium', 'high')", name="admin_tasks_priority_check"),
        CheckConstraint(
            "calendar_sync in ('off', 'manual', 'automatic')", name="admin_tasks_calendar_sync_check"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str | None] = mapped_column(String, server_default="todo")
    priority: Mapped[str | None] = mapped_column(String, server_default="medium")
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    calendar_sync: Mapped[str | None] = mapped_column(String, server_default="off")
    google_event_id: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    assignee = relationship("User", foreign_keys=[assigned_to], lazy="joined")
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
