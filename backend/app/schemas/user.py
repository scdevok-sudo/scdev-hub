import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

Role = Literal["admin", "collaborator"]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    name: str
    avatar_url: str | None = None
    role: Role
    created_at: datetime | None = None


class UserWithHours(UserOut):
    hours_this_month: float = 0.0
