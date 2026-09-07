import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Project, Task, TimeLog, User
from app.routers.projects import get_visible_project
from app.schemas import TimeLogCreate, TimeLogOut, TimeLogUpdate

router = APIRouter(tags=["time-logs"])


def can_edit(log: TimeLog, user: User) -> bool:
    """Regla 2: el owner solo puede editar el mismo día. Después, solo admin."""
    if user.is_admin:
        return True
    return log.user_id == user.id and log.logged_date == date.today()


def serialize(log: TimeLog, user: User) -> TimeLogOut:
    item = TimeLogOut.model_validate(log)
    item.project_name = log.project.name if log.project else None
    item.task_title = log.task.title if log.task else None
    item.editable = can_edit(log, user)
    return item


@router.get("/time-logs", response_model=list[TimeLogOut])
def my_time_logs(
    project_id: uuid.UUID | None = None,
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(TimeLog).where(TimeLog.user_id == user.id)
    if project_id:
        stmt = stmt.where(TimeLog.project_id == project_id)
    if month and year:
        start = date(year, month, 1)
        end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        stmt = stmt.where(TimeLog.logged_date >= start, TimeLog.logged_date < end)
    stmt = stmt.order_by(TimeLog.logged_date.desc(), TimeLog.created_at.desc())
    return [serialize(log, user) for log in db.scalars(stmt)]


@router.get("/projects/{project_id}/time-logs", response_model=list[TimeLogOut])
def project_time_logs(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = get_visible_project(db, user, project_id)
    stmt = select(TimeLog).where(TimeLog.project_id == project.id)
    if not user.is_admin:
        # Regla 6: un collaborator nunca ve logs ajenos.
        stmt = stmt.where(TimeLog.user_id == user.id)
    stmt = stmt.order_by(TimeLog.logged_date.desc(), TimeLog.created_at.desc())
    return [serialize(log, user) for log in db.scalars(stmt)]


@router.post("/time-logs", response_model=TimeLogOut, status_code=status.HTTP_201_CREATED)
def create_time_log(
    payload: TimeLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    # Cargar horas es lo que vuelve "asignado" a un collaborator, asi que no se
    # exige visibilidad previa; solo que el proyecto siga activo.
    if not user.is_admin and project.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El proyecto no esta activo")

    if payload.task_id:
        task = db.get(Task, payload.task_id)
        if not task or task.project_id != project.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La tarea no pertenece al proyecto")

    log = TimeLog(
        project_id=project.id,
        user_id=user.id,
        task_id=payload.task_id,
        description=payload.description,
        hours=payload.hours,
        logged_date=payload.logged_date or date.today(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return serialize(log, user)


@router.patch("/time-logs/{log_id}", response_model=TimeLogOut)
def update_time_log(
    log_id: uuid.UUID,
    payload: TimeLogUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = db.get(TimeLog, log_id)
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro no encontrado")
    if not can_edit(log, user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo se puede editar el mismo dia que se cargo. Pedile a un admin.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return serialize(log, user)


@router.delete("/time-logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_log(
    log_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = db.get(TimeLog, log_id)
    if not log:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro no encontrado")
    if not can_edit(log, user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Solo se puede borrar el mismo dia que se cargo. Pedile a un admin.",
        )
    db.delete(log)
    db.commit()
