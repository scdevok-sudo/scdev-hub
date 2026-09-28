import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models import AdminTask, User
from app.schemas import AdminTaskCreate, AdminTaskOut, AdminTaskUpdate

router = APIRouter(prefix="/admin-tasks", tags=["admin-tasks"])

STATUS_ORDER = {"todo": 0, "in_progress": 1, "done": 2}


@router.get("", response_model=list[AdminTaskOut])
def list_admin_tasks(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    tasks = list(db.scalars(select(AdminTask).order_by(AdminTask.created_at.asc())))
    return sorted(tasks, key=lambda t: STATUS_ORDER.get(t.status or "todo", 9))


@router.post("", response_model=AdminTaskOut, status_code=status.HTTP_201_CREATED)
def create_admin_task(
    payload: AdminTaskCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    task = AdminTask(**payload.model_dump(), created_by=admin.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=AdminTaskOut)
def update_admin_task(
    task_id: uuid.UUID,
    payload: AdminTaskUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    task = db.get(AdminTask, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pendiente no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    task = db.get(AdminTask, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pendiente no encontrado")
    db.delete(task)
    db.commit()
