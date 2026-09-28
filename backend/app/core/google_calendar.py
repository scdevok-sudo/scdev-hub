"""Integracion con Google Calendar (Parte E, fase 3).

Los eventos se crean en el calendario de la cuenta de Google admin que ya
tiene sesion en el Hub (no un calendario separado) -- decision ya tomada,
ver fase-3-calendario-subtareas-admin.md seccion E.6. Para tareas de
proyecto e hitos con fecha, se invita como *attendee* al email del
asignado; no requiere que cada colaborador de OAuth por separado.
"""

from datetime import date

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.crypto import decrypt_token
from app.models import User

TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


class GoogleCalendarNotConnected(Exception):
    """El admin no tiene refresh_token guardado -- tiene que reconsentir el login."""


def get_calendar_admin(db: Session) -> User:
    """El admin cuya cuenta de Google se usa para crear los eventos (ver modulo)."""
    admin = db.scalar(
        select(User).where(User.role == "admin", User.google_refresh_token.is_not(None)).limit(1)
    )
    if not admin:
        raise GoogleCalendarNotConnected(
            "Ningun admin tiene todavia un refresh_token de Google guardado. "
            "Cerra sesion y volve a entrar con Google para autorizar el acceso a Calendar "
            "(el popup de consentimiento tiene que aparecer -- si no aparece, revisa que el "
            "login este pidiendo prompt=consent)."
        )
    return admin


def _get_access_token(admin: User) -> str:
    if not admin.google_refresh_token:
        raise GoogleCalendarNotConnected(f"{admin.email} no tiene un refresh_token de Google guardado.")
    refresh_token = decrypt_token(admin.google_refresh_token)
    resp = httpx.post(
        TOKEN_URL,
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _event_body(title: str, due_date: date, attendee_email: str | None) -> dict:
    body: dict = {
        "summary": title,
        "start": {"date": due_date.isoformat()},
        "end": {"date": due_date.isoformat()},
    }
    if attendee_email:
        body["attendees"] = [{"email": attendee_email}]
    return body


def crear_evento(admin: User, *, title: str, due_date: date, attendee_email: str | None = None) -> str:
    access_token = _get_access_token(admin)
    resp = httpx.post(
        EVENTS_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"sendUpdates": "all"} if attendee_email else None,
        json=_event_body(title, due_date, attendee_email),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def actualizar_evento(
    admin: User, event_id: str, *, title: str, due_date: date, attendee_email: str | None = None
) -> str:
    access_token = _get_access_token(admin)
    resp = httpx.patch(
        f"{EVENTS_URL}/{event_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"sendUpdates": "all"} if attendee_email else None,
        json=_event_body(title, due_date, attendee_email),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def borrar_evento(admin: User, event_id: str) -> None:
    access_token = _get_access_token(admin)
    resp = httpx.delete(
        f"{EVENTS_URL}/{event_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    # 404/410: el evento ya no existe del lado de Google -- no es un error para nosotros.
    if resp.status_code not in (200, 204, 404, 410):
        resp.raise_for_status()


def sync_on_save(
    db: Session,
    *,
    calendar_sync: str | None,
    due_date: date | None,
    title: str,
    google_event_id: str | None,
    attendee_email: str | None = None,
) -> str | None:
    """Logica compartida por los 4 lugares con calendar_sync (tasks, invoices,
    client_services, project_milestones). Se llama despues de guardar el
    registro con los valores YA actualizados; devuelve el google_event_id que
    hay que persistir.

    - 'off': no hace nada, no toca el event_id que ya hubiera.
    - 'manual': el primer evento lo crea el boton "Agendar" (ver *_agendar en
      cada router); aca solo actualiza un evento que ya exista, para no perder
      sync si cambia la fecha/titulo despues de agendado a mano.
    - 'automatic': crea si no existe evento, actualiza si ya existe.
    - Sin fecha (due_date=None): si habia un evento sincronizado, se borra.
    """
    sync = calendar_sync or "off"

    if due_date is None:
        if google_event_id and sync != "off":
            borrar_evento(get_calendar_admin(db), google_event_id)
        return None

    if sync == "off":
        return google_event_id

    if sync == "manual" and not google_event_id:
        return None

    admin = get_calendar_admin(db)
    if google_event_id:
        return actualizar_evento(admin, google_event_id, title=title, due_date=due_date, attendee_email=attendee_email)
    return crear_evento(admin, title=title, due_date=due_date, attendee_email=attendee_email)


def sync_on_delete(db: Session, *, calendar_sync: str | None, google_event_id: str | None) -> None:
    if google_event_id and (calendar_sync or "off") != "off":
        borrar_evento(get_calendar_admin(db), google_event_id)


def agendar_manual(db: Session, *, title: str, due_date: date, attendee_email: str | None = None) -> str:
    """Boton "Agendar": crea el evento una vez, sin importar el calendar_sync actual."""
    return crear_evento(get_calendar_admin(db), title=title, due_date=due_date, attendee_email=attendee_email)
