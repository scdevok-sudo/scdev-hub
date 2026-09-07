import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.user import UserOut

MIN_HOURS = Decimal("0.25")
MAX_HOURS = Decimal("24")
STEP = Decimal("0.25")


def _validate_hours(value: Decimal) -> Decimal:
    if value < MIN_HOURS or value > MAX_HOURS:
        raise ValueError("Las horas deben estar entre 0.25 y 24")
    if (value % STEP) != 0:
        raise ValueError("Las horas deben ser múltiplos de 0.25")
    return value


class TimeLogCreate(BaseModel):
    project_id: uuid.UUID
    task_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=2000)
    hours: Decimal
    logged_date: date | None = None

    @field_validator("hours")
    @classmethod
    def check_hours(cls, v: Decimal) -> Decimal:
        return _validate_hours(v)

    @field_validator("logged_date")
    @classmethod
    def no_future(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("No se pueden cargar horas con fecha futura")
        return v


class TimeLogUpdate(BaseModel):
    task_id: uuid.UUID | None = None
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    hours: Decimal | None = None
    logged_date: date | None = None

    @field_validator("hours")
    @classmethod
    def check_hours(cls, v: Decimal | None) -> Decimal | None:
        return _validate_hours(v) if v is not None else v

    @field_validator("logged_date")
    @classmethod
    def no_future(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("No se pueden cargar horas con fecha futura")
        return v


class TimeLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    description: str
    hours: Decimal
    logged_date: date
    created_at: datetime | None = None
    user: UserOut | None = None
    project_name: str | None = None
    task_title: str | None = None
    editable: bool = False
