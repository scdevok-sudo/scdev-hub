from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models import TimeLog, User
from app.schemas import UserOut, UserWithHours

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Equipo completo — necesario para selects de asignación."""
    return list(db.scalars(select(User).order_by(User.name)))


@router.get("/admin/users", response_model=list[UserWithHours])
def list_users_with_hours(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    today = date.today()
    start = today.replace(day=1)

    hours_by_user = dict(
        db.execute(
            select(TimeLog.user_id, func.coalesce(func.sum(TimeLog.hours), 0))
            .where(TimeLog.logged_date >= start, TimeLog.logged_date <= today)
            .group_by(TimeLog.user_id)
        ).all()
    )

    users = db.scalars(select(User).order_by(User.name))
    return [
        UserWithHours(
            id=u.id,
            email=u.email,
            name=u.name,
            avatar_url=u.avatar_url,
            role=u.role,
            created_at=u.created_at,
            hours_this_month=float(hours_by_user.get(u.id, 0) or 0),
        )
        for u in users
    ]
