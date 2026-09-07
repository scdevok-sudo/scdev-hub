import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.payouts import split_by_user
from app.models import Project, Task, TimeLog, User
from app.schemas import (
    PayoutRow,
    ProjectCreate,
    ProjectOut,
    ProjectSummary,
    ProjectUpdate,
    UserOut,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def visible_project_ids(db: Session, user: User) -> set[uuid.UUID] | None:
    """None = puede ver todos (admin). Set = proyectos donde el collaborator participa."""
    if user.is_admin:
        return None
    from_tasks = select(Task.project_id).where(Task.assigned_to == user.id)
    from_logs = select(TimeLog.project_id).where(TimeLog.user_id == user.id)
    ids = set(db.scalars(from_tasks)) | set(db.scalars(from_logs))
    ids.discard(None)
    return ids


def get_visible_project(db: Session, user: User, project_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    allowed = visible_project_ids(db, user)
    if allowed is not None and project.id not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sin acceso a este proyecto")
    return project


def _decorate(db: Session, projects: list[Project]) -> list[ProjectOut]:
    if not projects:
        return []
    ids = [p.id for p in projects]
    hours = dict(
        db.execute(
            select(TimeLog.project_id, func.coalesce(func.sum(TimeLog.hours), 0))
            .where(TimeLog.project_id.in_(ids))
            .group_by(TimeLog.project_id)
        ).all()
    )
    open_tasks = dict(
        db.execute(
            select(Task.project_id, func.count(Task.id))
            .where(Task.project_id.in_(ids), Task.status != "done")
            .group_by(Task.project_id)
        ).all()
    )
    out = []
    for p in projects:
        item = ProjectOut.model_validate(p)
        item.logged_hours = float(hours.get(p.id, 0) or 0)
        item.open_tasks = int(open_tasks.get(p.id, 0) or 0)
        out.append(item)
    return out


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Project).order_by(Project.created_at.desc())
    allowed = visible_project_ids(db, user)
    if allowed is not None:
        # Collaborator: solo proyectos activos donde participa.
        if not allowed:
            return []
        stmt = stmt.where(Project.id.in_(allowed), Project.status == "active")
    return _decorate(db, list(db.scalars(stmt)))


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    project = Project(**payload.model_dump(), created_by=admin.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return _decorate(db, [project])[0]


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = get_visible_project(db, user, project_id)
    return _decorate(db, [project])[0]


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _decorate(db, [project])[0]


@router.get("/{project_id}/summary", response_model=ProjectSummary)
def project_summary(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = get_visible_project(db, user, project_id)

    rows = db.execute(
        select(TimeLog.user_id, func.coalesce(func.sum(TimeLog.hours), 0))
        .where(TimeLog.project_id == project.id)
        .group_by(TimeLog.user_id)
    ).all()
    hours_by_user = {uid: float(h or 0) for uid, h in rows if uid is not None}

    total_hours, distributable, split = split_by_user(
        hours_by_user, project.billed_amount, project.structure_pct
    )

    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(hours_by_user.keys() or [uuid.uuid4()])))}
    payout_rows = [
        PayoutRow(
            user=UserOut.model_validate(users[uid]),
            hours=hours,
            share_pct=split[uid][0],
            payout=split[uid][1],
        )
        for uid, hours in sorted(hours_by_user.items(), key=lambda kv: -kv[1])
        if uid in users
    ]

    billed = float(project.billed_amount or 0)
    return ProjectSummary(
        project_id=project.id,
        billed_amount=billed,
        structure_pct=float(project.structure_pct or 0),
        structure_amount=billed - distributable,
        distributable=distributable,
        total_hours=total_hours,
        rows=payout_rows,
    )
