import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.google_calendar import GoogleCalendarNotConnected, agendar_manual, sync_on_delete, sync_on_save
from app.models import ProjectMilestone, User
from app.routers.projects import get_visible_project
from app.schemas import MilestoneCreate, MilestoneOut, MilestoneUpdate

router = APIRouter(tags=["projects"])


def _get_milestone(db: Session, user: User, milestone_id: uuid.UUID) -> ProjectMilestone:
    milestone = db.get(ProjectMilestone, milestone_id)
    if not milestone:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hito no encontrado")
    get_visible_project(db, user, milestone.project_id)
    return milestone


def _sync_milestone_calendar(db: Session, milestone: ProjectMilestone) -> None:
    try:
        event_id = sync_on_save(
            db,
            calendar_sync=milestone.calendar_sync,
            due_date=milestone.due_date,
            title=f"Hito: {milestone.title} ({milestone.project.name if milestone.project else ''})",
            google_event_id=milestone.google_event_id,
        )
    except GoogleCalendarNotConnected as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(err)) from err
    except httpx.HTTPError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Error hablando con Google Calendar: {err}") from err

    if event_id != milestone.google_event_id:
        milestone.google_event_id = event_id
        db.commit()
        db.refresh(milestone)


@router.get("/projects/{project_id}/milestones", response_model=list[MilestoneOut])
def list_milestones(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = get_visible_project(db, user, project_id)
    return list(
        db.scalars(
            select(ProjectMilestone)
            .where(ProjectMilestone.project_id == project.id)
            .order_by(ProjectMilestone.due_date.asc().nulls_last())
        )
    )


@router.post(
    "/projects/{project_id}/milestones", response_model=MilestoneOut, status_code=status.HTTP_201_CREATED
)
def create_milestone(
    project_id: uuid.UUID,
    payload: MilestoneCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = get_visible_project(db, user, project_id)
    milestone = ProjectMilestone(**payload.model_dump(), project_id=project.id, created_by=user.id)
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    if milestone.calendar_sync != "off" and milestone.due_date:
        _sync_milestone_calendar(db, milestone)
    return milestone


@router.post("/milestones/{milestone_id}/agendar", response_model=MilestoneOut)
def agendar_milestone(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    milestone = _get_milestone(db, user, milestone_id)
    if not milestone.due_date:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El hito no tiene fecha")
    try:
        event_id = agendar_manual(
            db,
            title=f"Hito: {milestone.title} ({milestone.project.name if milestone.project else ''})",
            due_date=milestone.due_date,
        )
    except GoogleCalendarNotConnected as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(err)) from err
    except httpx.HTTPError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Error hablando con Google Calendar: {err}") from err
    milestone.google_event_id = event_id
    db.commit()
    db.refresh(milestone)
    return milestone


@router.patch("/milestones/{milestone_id}", response_model=MilestoneOut)
def update_milestone(
    milestone_id: uuid.UUID,
    payload: MilestoneUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    milestone = _get_milestone(db, user, milestone_id)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(milestone, field, value)
    db.commit()
    db.refresh(milestone)

    if milestone.calendar_sync != "off" or "due_date" in changes or "calendar_sync" in changes:
        _sync_milestone_calendar(db, milestone)

    return milestone


@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(
    milestone_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    milestone = _get_milestone(db, user, milestone_id)
    try:
        sync_on_delete(db, calendar_sync=milestone.calendar_sync, google_event_id=milestone.google_event_id)
    except (GoogleCalendarNotConnected, httpx.HTTPError):
        pass
    db.delete(milestone)
    db.commit()
