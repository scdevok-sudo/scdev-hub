from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.payouts import payout_for
from app.models import Project, Task, TimeLog, User
from app.routers.projects import visible_project_ids
from app.routers.time_logs import serialize
from app.schemas import DashboardOut

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    month_start = today.replace(day=1)

    hours_this_month = float(
        db.scalar(
            select(func.coalesce(func.sum(TimeLog.hours), 0)).where(
                TimeLog.user_id == user.id,
                TimeLog.logged_date >= month_start,
                TimeLog.logged_date <= today,
            )
        )
        or 0
    )

    # Estimado a cobrar: reparto del usuario en cada proyecto ya facturado
    # donde tenga horas cargadas.
    estimated_payout = 0.0
    project_hours = db.execute(
        select(TimeLog.project_id, func.coalesce(func.sum(TimeLog.hours), 0))
        .where(TimeLog.user_id == user.id)
        .group_by(TimeLog.project_id)
    ).all()
    for project_id, my_hours in project_hours:
        if not project_id:
            continue
        project = db.get(Project, project_id)
        if not project or not project.billed_amount:
            continue
        total = float(
            db.scalar(
                select(func.coalesce(func.sum(TimeLog.hours), 0)).where(
                    TimeLog.project_id == project_id
                )
            )
            or 0
        )
        distributable = float(project.billed_amount) * (1 - float(project.structure_pct or 0))
        estimated_payout += payout_for(float(my_hours or 0), total, distributable)

    allowed = visible_project_ids(db, user)
    active_stmt = select(func.count(Project.id)).where(Project.status == "active")
    if allowed is not None:
        if not allowed:
            active_projects = 0
        else:
            active_stmt = active_stmt.where(Project.id.in_(allowed))
            active_projects = int(db.scalar(active_stmt) or 0)
    else:
        active_projects = int(db.scalar(active_stmt) or 0)

    pending_tasks = int(
        db.scalar(
            select(func.count(Task.id)).where(Task.assigned_to == user.id, Task.status != "done")
        )
        or 0
    )

    recent = db.scalars(
        select(TimeLog)
        .where(TimeLog.user_id == user.id, TimeLog.logged_date >= today - timedelta(days=7))
        .order_by(TimeLog.logged_date.desc(), TimeLog.created_at.desc())
    )

    return DashboardOut(
        hours_this_month=hours_this_month,
        estimated_payout=round(estimated_payout, 2),
        active_projects=active_projects,
        pending_tasks=pending_tasks,
        recent_logs=[serialize(log, user) for log in recent],
    )
