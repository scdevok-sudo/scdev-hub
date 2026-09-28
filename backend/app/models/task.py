import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("status in ('todo', 'in_progress', 'done')", name="tasks_status_check"),
        CheckConstraint("priority in ('low', 'medium', 'high')", name="tasks_priority_check"),
        CheckConstraint(
            "claim_status in ('pending', 'approved', 'rejected') or claim_status is null",
            name="tasks_claim_status_check",
        ),
        CheckConstraint(
            "calendar_sync in ('off', 'manual', 'automatic')", name="tasks_calendar_sync_check"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    parent_task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    details: Mapped[str | None] = mapped_column(Text)
    checklist: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    status: Mapped[str] = mapped_column(String, nullable=False, server_default="todo")
    priority: Mapped[str] = mapped_column(String, nullable=False, server_default="medium")
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    claim_status: Mapped[str | None] = mapped_column(String)
    claimed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    due_date: Mapped[date | None] = mapped_column(Date)
    calendar_sync: Mapped[str | None] = mapped_column(String, server_default="off")
    google_event_id: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    assignee = relationship("User", foreign_keys=[assigned_to], lazy="joined")
    claimer = relationship("User", foreign_keys=[claimed_by], lazy="joined")
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    project = relationship("Project", lazy="joined")
    parent = relationship("Task", remote_side=[id], foreign_keys=[parent_task_id])


class TaskComment(Base):
    """Log inmutable (GET+POST, sin PATCH/DELETE) para una tarea.

    `tipo` distingue comentarios ('comment') de notas ('note', Parte B de la
    fase 3) -- misma tabla, mismo comportamiento, dos secciones separadas en
    la API y en la UI. Ver migracion 010 para la justificacion completa.
    """

    __tablename__ = "task_comments"
    __table_args__ = (
        CheckConstraint("tipo in ('comment', 'note')", name="task_comments_tipo_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(String, nullable=False, server_default="comment")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", lazy="joined")
