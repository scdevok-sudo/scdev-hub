import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.google_calendar import GoogleCalendarNotConnected, agendar_manual, sync_on_delete, sync_on_save
from app.models import Project, Task, TaskComment, User
from app.routers.projects import get_visible_project
from app.schemas import (
    CommentCreate,
    CommentOut,
    NoteCreate,
    NoteOut,
    PendingClaim,
    TaskCreate,
    TaskOut,
    TaskUpdate,
)

router = APIRouter(tags=["tasks"])

STATUS_ORDER = {"todo": 0, "in_progress": 1, "done": 2}


def _sync_task_calendar(db: Session, task: Task) -> None:
    """Parte E, fase 3: crea/actualiza/borra el evento de Calendar segun
    task.calendar_sync. No falla en silencio -- si la sync no se pudo hacer,
    devuelve un 502 claro, pero la tarea ya quedo guardada (el commit anterior
    no se revierte)."""
    try:
        event_id = sync_on_save(
            db,
            calendar_sync=task.calendar_sync,
            due_date=task.due_date,
            title=task.title,
            google_event_id=task.google_event_id,
            attendee_email=task.assignee.email if task.assignee else None,
        )
    except GoogleCalendarNotConnected as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(err)) from err
    except httpx.HTTPError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Error hablando con Google Calendar: {err}") from err

    if event_id != task.google_event_id:
        task.google_event_id = event_id
        db.commit()
        db.refresh(task)


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
    # Las subtareas no aparecen como columna propia del Kanban: viven en el
    # drawer de su tarea madre (GET /tasks/{id}/subtasks).
    tasks = list(
        db.scalars(
            select(Task)
            .where(Task.project_id == project.id, Task.parent_task_id.is_(None))
            .order_by(Task.created_at.asc())
        )
    )
    counts = {
        parent_id: (total, done)
        for parent_id, total, done in db.execute(
            select(
                Task.parent_task_id,
                func.count(),
                func.count().filter(Task.status == "done"),
            )
            .where(Task.project_id == project.id, Task.parent_task_id.is_not(None))
            .group_by(Task.parent_task_id)
        )
    }
    for task in tasks:
        task.subtask_count, task.subtask_done = counts.get(task.id, (0, 0))
    return sorted(tasks, key=lambda t: STATUS_ORDER.get(t.status, 9))


@router.get("/tasks/{task_id}/subtasks", response_model=list[TaskOut])
def list_subtasks(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = _get_task(db, user, task_id)
    return list(
        db.scalars(
            select(Task).where(Task.parent_task_id == task.id).order_by(Task.created_at.asc())
        )
    )


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

    if payload.parent_task_id:
        parent = db.get(Task, payload.parent_task_id)
        if not parent or parent.project_id != project.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "La tarea madre no existe en este proyecto")
        if parent.parent_task_id is not None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Solo se admite un nivel de subtareas (la madre ya es una subtarea)",
            )

    task = Task(**payload.model_dump(), project_id=project.id, created_by=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    if task.calendar_sync != "off" and task.due_date:
        _sync_task_calendar(db, task)
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

    # Parte D (fase 3): antes, cualquiera con acceso al proyecto podia editar
    # cualquier tarea. Ahora: el creador, el asignado actual, o admin.
    if not (user.is_admin or task.created_by == user.id or task.assigned_to == user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Solo el creador, el asignado o un admin puede editar esta tarea"
        )
    # Reasignar (cambiar a quien esta asignada) queda reservado a admin: un
    # collaborator no puede mover el trabajo de otra persona.
    if "assigned_to" in changes and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo un admin puede reasignar la tarea")

    for field, value in changes.items():
        setattr(task, field, value)

    # Asignar (o desasignar) a mano pisa cualquier solicitud en curso: la decision
    # manual del admin manda sobre el pedido pendiente.
    if "assigned_to" in changes:
        task.claim_status = None
        task.claimed_by = None

    db.commit()
    db.refresh(task)

    if task.calendar_sync != "off" or "due_date" in changes or "calendar_sync" in changes:
        _sync_task_calendar(db, task)

    return task


@router.post("/tasks/{task_id}/agendar", response_model=TaskOut)
def agendar_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Boton "Agendar" (calendar_sync='manual'): crea el evento una sola vez."""
    task = _get_task(db, user, task_id)
    if not task.due_date:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La tarea no tiene fecha para agendar")
    try:
        event_id = agendar_manual(
            db,
            title=task.title,
            due_date=task.due_date,
            attendee_email=task.assignee.email if task.assignee else None,
        )
    except GoogleCalendarNotConnected as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(err)) from err
    except httpx.HTTPError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Error hablando con Google Calendar: {err}") from err
    task.google_event_id = event_id
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
    try:
        sync_on_delete(db, calendar_sync=task.calendar_sync, google_event_id=task.google_event_id)
    except (GoogleCalendarNotConnected, httpx.HTTPError):
        # Borrar la tarea no debe quedar bloqueado porque Calendar no responda;
        # el evento queda huerfano del lado de Google, aceptable en el borrado.
        pass
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
            .where(TaskComment.task_id == task_id, TaskComment.tipo == "comment")
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
    comment = TaskComment(task_id=task_id, user_id=user.id, content=payload.content, tipo="comment")
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/tasks/{task_id}/notes", response_model=list[NoteOut])
def list_notes(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Bitacora de notas, separada de los comentarios (misma tabla, tipo='note')."""
    _get_task(db, user, task_id)
    return list(
        db.scalars(
            select(TaskComment)
            .where(TaskComment.task_id == task_id, TaskComment.tipo == "note")
            .order_by(TaskComment.created_at.asc())
        )
    )


@router.post("/tasks/{task_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    task_id: uuid.UUID,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_task(db, user, task_id)
    note = TaskComment(task_id=task_id, user_id=user.id, content=payload.content, tipo="note")
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
