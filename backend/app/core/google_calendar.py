"""Integracion con Google Calendar (Parte E, fase 3).

Los eventos se crean en el calendario de la cuenta de Google admin que ya
tiene sesion en el Hub (no un calendario separado) -- decision ya tomada,
ver fase-3-calendario-subtareas-admin.md seccion E.6. Para tareas de
proyecto e hitos con fecha, se invita como *attendee* al email del
asignado; no requiere que cada colaborador de OAuth por separado.
"""

import calendar
from datetime import date, timedelta

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
            "Google Calendar no esta conectado. Usa el boton "
            '"Conectar Google Calendar" en Admin para autorizar el acceso.'
        )
    return admin


def _get_access_token(admin: User) -> str:
    if not admin.google_refresh_token:
        raise GoogleCalendarNotConnected(
            f'{admin.email} no tiene Google Calendar conectado (boton "Conectar Google Calendar" en Admin).'
        )
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


def _event_body(
    title: str, due_date: date, attendee_email: str | None, recurrence: list[str] | None = None
) -> dict:
    body: dict = {
        "summary": title,
        "start": {"date": due_date.isoformat()},
        "end": {"date": due_date.isoformat()},
    }
    if attendee_email:
        body["attendees"] = [{"email": attendee_email}]
    if recurrence:
        # Recurrentes de dia completo: Google exige end exclusivo (dia siguiente).
        body["end"] = {"date": (due_date + timedelta(days=1)).isoformat()}
        body["recurrence"] = recurrence
    return body


def crear_evento(
    admin: User,
    *,
    title: str,
    due_date: date,
    attendee_email: str | None = None,
    recurrence: list[str] | None = None,
) -> str:
    access_token = _get_access_token(admin)
    resp = httpx.post(
        EVENTS_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"sendUpdates": "all"} if attendee_email else None,
        json=_event_body(title, due_date, attendee_email, recurrence),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def actualizar_evento(
    admin: User,
    event_id: str,
    *,
    title: str,
    due_date: date,
    attendee_email: str | None = None,
    recurrence: list[str] | None = None,
) -> str:
    access_token = _get_access_token(admin)
    resp = httpx.patch(
        f"{EVENTS_URL}/{event_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"sendUpdates": "all"} if attendee_email else None,
        json=_event_body(title, due_date, attendee_email, recurrence),
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


# --------------------------------------------------------------------------
# Recordatorios recurrentes (gastos recurrentes y servicios de clientes).
#
# Regla distinta a la de sync_on_save (que comparten tareas, facturas e hitos y
# NO se toca): aca 'manual' crea el evento UNA vez al guardar y despues no lo
# vuelve a tocar aunque cambie la fecha en el Hub -- queda a cargo del admin en
# Calendar. 'automatic' crea/actualiza en cada guardado.
# --------------------------------------------------------------------------


def next_occurrence(day: int, today: date | None = None) -> date:
    """Proxima fecha (hoy incluido) en que cae `day`; en meses cortos, el ultimo dia."""
    today = today or date.today()
    for offset in (0, 1):
        month_index = today.month - 1 + offset
        year, month = today.year + month_index // 12, month_index % 12 + 1
        candidate = date(year, month, min(day, calendar.monthrange(year, month)[1]))
        if candidate >= today:
            return candidate
    raise AssertionError("unreachable")


def build_recurrence(frecuencia: str | None, start: date) -> list[str] | None:
    """RRULE del evento. Solo mensual y anual se repiten; el resto es un evento suelto.

    Mensual con dia 29-31: "ultimo dia <= d del mes" (BYMONTHDAY=28..d con
    BYSETPOS=-1). Con BYMONTHDAY=d a secas, o con 29,30,31, Google saltea los
    meses que no tienen ese dia (febrero) o cae en el 31 cuando se pidio el 29.
    """
    if frecuencia == "mensual":
        if start.day <= 28:
            return [f"RRULE:FREQ=MONTHLY;BYMONTHDAY={start.day}"]
        days = ",".join(str(d) for d in range(28, start.day + 1))
        return [f"RRULE:FREQ=MONTHLY;BYMONTHDAY={days};BYSETPOS=-1"]
    if frecuencia == "anual":
        return ["RRULE:FREQ=YEARLY"]
    return None


def sync_recurring_on_save(
    db: Session,
    *,
    calendar_sync: str | None,
    previous_sync: str | None,
    title: str,
    start_date: date | None,
    recurrence: list[str] | None,
    google_event_id: str | None,
) -> str | None:
    """Devuelve el google_event_id a persistir. Reglas en el comentario del bloque."""
    sync = calendar_sync or "off"

    if sync == "off":
        # Solo se borra el evento que el Hub mantenia (automatic). Uno manual es del admin.
        if google_event_id and (previous_sync or "off") == "automatic":
            borrar_evento(get_calendar_admin(db), google_event_id)
            return None
        return google_event_id

    if start_date is None:
        return google_event_id

    if sync == "manual":
        if google_event_id:
            return google_event_id
        return crear_evento(get_calendar_admin(db), title=title, due_date=start_date, recurrence=recurrence)

    admin = get_calendar_admin(db)
    if google_event_id:
        return actualizar_evento(admin, google_event_id, title=title, due_date=start_date, recurrence=recurrence)
    return crear_evento(admin, title=title, due_date=start_date, recurrence=recurrence)


def sync_recurring_on_delete(db: Session, *, google_event_id: str | None) -> None:
    """Al borrar el registro se borra el evento (manual o automatico) si hay id."""
    if google_event_id:
        borrar_evento(get_calendar_admin(db), google_event_id)


# --------------------------------------------------------------------------
# Estado de la conexion (boton "Conectar Google Calendar" en Admin).
# --------------------------------------------------------------------------

CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"


def check_connection(user: User) -> tuple[bool, str | None]:
    """Valida con un refresh real: (conectado, motivo si no)."""
    if not user.google_refresh_token:
        return False, "not_connected"
    try:
        resp = httpx.post(
            TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": decrypt_token(user.google_refresh_token),
                "grant_type": "refresh_token",
            },
            timeout=10,
        )
    except Exception:
        return False, "error"
    if resp.status_code in (400, 401):
        return False, "revoked"  # invalid_grant: revocado o vencido
    if not resp.is_success:
        return False, "error"
    if CALENDAR_SCOPE not in (resp.json().get("scope") or "").split():
        return False, "missing_scope"
    return True, None
