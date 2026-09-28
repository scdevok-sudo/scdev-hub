import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.task import CalendarSync


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    due_date: date | None = None
    calendar_sync: CalendarSync = "off"


class MilestoneUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    due_date: date | None = None
    calendar_sync: CalendarSync | None = None


class MilestoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    due_date: date | None = None
    calendar_sync: CalendarSync | None = "off"
    google_event_id: str | None = None
    created_by: uuid.UUID | None = None
