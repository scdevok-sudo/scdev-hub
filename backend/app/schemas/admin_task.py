import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.task import CalendarSync, TaskPriority, TaskStatus
from app.schemas.user import UserOut


class AdminTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    assigned_to: uuid.UUID | None = None
    due_date: date | None = None
    calendar_sync: CalendarSync = "off"


class AdminTaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assigned_to: uuid.UUID | None = None
    due_date: date | None = None
    calendar_sync: CalendarSync | None = None


class AdminTaskOut(BaseModel):
    """Misma forma que TaskOut (fase 3, Parte C) para que el frontend reuse
    el componente de Kanban y el tipo `Task` sin ramas especiales -- los
    campos que no existen en admin_tasks (checklist, subtareas, claim) van
    siempre vacios/null."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: None = None
    parent_task_id: None = None
    title: str
    description: str | None = None
    details: None = None
    checklist: list = []
    status: TaskStatus | None = "todo"
    priority: TaskPriority | None = "medium"
    assigned_to: uuid.UUID | None = None
    claim_status: None = None
    claimed_by: None = None
    created_by: uuid.UUID | None = None
    due_date: date | None = None
    calendar_sync: CalendarSync | None = "off"
    google_event_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    assignee: UserOut | None = None
    claimer: None = None
