import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models import Project, Task, TaskComment, User
from app.routers.projects import get_visible_project
from app.schemas import (
    CommentCreate,
    CommentOut,
    PendingClaim,
    TaskCreate,
    TaskOut,
    TaskUpdate,
)

router = APIRouter(tags=["tasks"])

STATUS_ORDER = {"todo": 0, "in_progress": 1, "done": 2}


def _get_task(db: Session, user: User, task_id: uuid.UUID) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    if task.project_id:
        get_visible_project(db, user, task.project_id)
    return task


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = get_visible_project(db, user, project_id)
    tasks = list(
        db.scalars(
            select(Task).where(Task.project_id == project.id).order_by(Task.created_at.asc())
        )
    )
    return sorted(tasks, key=lambda t: STATUS_ORDER.get(t.status, 9))


@router.post(
    "/projects/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED
)
def create_task(
    project_id: uuid.UUID,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = get_visible_project(db, user, project_id)
    task = Task(**payload.model_dump(), project_id=project.id, created_by=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task(db, user, task_id)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(task, field, value)

    # Asignar (o desasignar) a mano pisa cualquier solicitud en curso: la decision
    # manual del admin manda sobre el pedido pendiente.
    if "assigned_to" in changes:
        task.claim_status = None
        task.claimed_by = None

    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task(db, user, task_id)
    if not user.is_admin and task.created_by != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el creador o un admin puede borrarla")
    db.delete(task)
    db.commit()


@router.post("/tasks/{task_id}/claim", response_model=TaskOut)
def claim_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Pedir una tarea sin asignar. Queda pendiente hasta que un admin resuelva."""
    task = _get_task(db, user, task_id)

    if task.assigned_to is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "La tarea ya esta asignada")

    if task.claim_status == "pending":
        if task.claimed_by == user.id:
            return task
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya hay una solicitud pendiente")

    task.claimed_by = user.id
    task.claim_status = "pending"
    db.commit()
    db.refresh(task)
    return task


@router.post("/tasks/{task_id}/approve-claim", response_model=TaskOut)
def approve_claim(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    if task.claim_status != "pending" or not task.claimed_by:
        raise HTTPException(status.HTTP_409_CONFLICT, "La tarea no tiene solicitud pendiente")

    task.assigned_to = task.claimed_by
    task.claim_status = "approved"
    task.claimed_by = None
    db.commit()
    db.refresh(task)
    return task


@router.post("/tasks/{task_id}/reject-claim", response_model=TaskOut)
def reject_claim(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    if task.claim_status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "La tarea no tiene solicitud pendiente")

    # Vuelve a estar disponible para que la pida otro.
    task.claim_status = None
    task.claimed_by = None
    db.commit()
    db.refresh(task)
    return task


@router.get("/admin/claims", response_model=list[PendingClaim])
def list_pending_claims(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    rows = db.execute(
        select(Task, Project.name)
        .outerjoin(Project, Project.id == Task.project_id)
        .where(Task.claim_status == "pending")
        .order_by(Task.updated_at.desc())
    ).all()
    return [
        PendingClaim(
            task=TaskOut.model_validate(task),
            project_id=task.project_id,
            project_name=project_name,
            claimer=task.claimer,
        )
        for task, project_name in rows
    ]

@router.get("/tasks/{task_id}/comments", response_model=list[CommentOut])
def list_comments(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_task(db, user, task_id)
    return list(
        db.scalars(
            select(TaskComment)
            .where(TaskComment.task_id == task_id)
            .order_by(TaskComment.created_at.asc())
        )
    )


@router.post(
    "/tasks/{task_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED
)
def create_comment(
    task_id: uuid.UUID,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_task(db, user, task_id)
    comment = TaskComment(task_id=task_id, user_id=user.id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
