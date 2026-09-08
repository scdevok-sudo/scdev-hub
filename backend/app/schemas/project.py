import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserOut

ProjectStatus = Literal["active", "paused", "completed"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    client_name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: ProjectStatus = "active"
    structure_pct: Decimal = Field(default=Decimal("0.25"), ge=0, le=1)
    billed_amount: Decimal = Field(default=Decimal("0"), ge=0)
    estimated_hours: Decimal | None = Field(default=None, ge=0)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    client_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: ProjectStatus | None = None
    structure_pct: Decimal | None = Field(default=None, ge=0, le=1)
    billed_amount: Decimal | None = Field(default=None, ge=0)
    estimated_hours: Decimal | None = Field(default=None, ge=0)


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    client_name: str
    description: str | None = None
    status: ProjectStatus
    structure_pct: Decimal
    billed_amount: Decimal | None = None
    estimated_hours: Decimal | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    logged_hours: float = 0.0
    open_tasks: int = 0
    member_ids: list[uuid.UUID] = []


class PayoutRow(BaseModel):
    user: UserOut
    hours: float
    share_pct: float
    payout: float


class ProjectSummary(BaseModel):
    project_id: uuid.UUID
    billed_amount: float
    structure_pct: float
    structure_amount: float
    distributable: float
    total_hours: float
    rows: list[PayoutRow]


class MemberCreate(BaseModel):
    user_id: uuid.UUID


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    created_at: datetime | None = None
    user: UserOut | None = None
