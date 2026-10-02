import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserOut

TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]
ClaimStatus = Literal["pending", "approved", "rejected"]
CalendarSync = Literal["off", "manual", "automatic"]


class ChecklistItem(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=500)
    done: bool = False


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    details: str | None = None
    checklist: list[ChecklistItem] = []
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    assigned_to: uuid.UUID | None = None
    parent_task_id: uuid.UUID | None = None
    due_date: date | None = None
    calendar_sync: CalendarSync = "off"


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    details: str | None = None
    checklist: list[ChecklistItem] | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assigned_to: uuid.UUID | None = None
    due_date: date | None = None
    calendar_sync: CalendarSync | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None = None
    parent_task_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    details: str | None = None
    checklist: list[ChecklistItem] = []
    status: TaskStatus
    priority: TaskPriority
    assigned_to: uuid.UUID | None = None
    claim_status: ClaimStatus | None = None
    claimed_by: uuid.UUID | None = None
    created_by: uuid.UUID | None = None
    due_date: date | None = None
    calendar_sync: CalendarSync | None = "off"
    google_event_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    assignee: UserOut | None = None
    claimer: UserOut | None = None
    # Solo se completan en GET /projects/{id}/tasks (para el chevron de la card).
    subtask_count: int = 0
    subtask_done: int = 0


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    content: str
    created_at: datetime | None = None
    user: UserOut | None = None


class NoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class NoteOut(BaseModel):
    """Misma tabla que CommentOut (task_comments, tipo='note') -- ver migracion 010."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID | None = None
    content: str
    created_at: datetime | None = None
    author_id: uuid.UUID | None = Field(default=None, validation_alias="user_id")
    author: UserOut | None = Field(default=None, validation_alias="user")


class PendingClaim(BaseModel):
    """Una solicitud pendiente, con lo minimo para decidir sin abrir el proyecto."""

    task: TaskOut
    project_id: uuid.UUID | None = None
    project_name: str | None = None
    claimer: UserOut | None = None
