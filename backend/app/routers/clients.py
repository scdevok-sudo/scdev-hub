import uuid
from datetime import date, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.google_calendar import (
    GoogleCalendarNotConnected,
    build_recurrence,
    crear_evento,
    get_calendar_admin,
    sync_recurring_on_delete,
    sync_recurring_on_save,
)
from app.models import Client, ClientService, Invoice, User
from app.schemas import (
    ClientCreate,
    ClientOut,
    ClientServiceCreate,
    ClientServiceOut,
    ClientServicesPipeline,
    ClientServiceUpdate,
    ClientUpdate,
    InvoiceOut,
)

router = APIRouter(tags=["finance"])


def _service_title(service: ClientService) -> str:
    return f"Vencimiento: {service.servicio} ({service.client.name if service.client else ''})"


def _service_recurrence(service: ClientService) -> list[str] | None:
    start = service.proxima_fecha_vencimiento
    return build_recurrence(service.recurrencia, start) if start else None


def _sync_service_calendar(db: Session, service: ClientService, previous_sync: str | None) -> None:
    """Evento recurrente segun `recurrencia`, anclado en `proxima_fecha_vencimiento`.

    A diferencia de tareas/facturas/hitos, 'manual' crea una sola vez y no vuelve
    a tocar el evento (ver sync_recurring_on_save).
    """
    try:
        event_id = sync_recurring_on_save(
            db,
            calendar_sync=service.calendar_sync,
            previous_sync=previous_sync,
            title=_service_title(service),
            start_date=service.proxima_fecha_vencimiento,
            recurrence=_service_recurrence(service),
            google_event_id=service.google_event_id,
        )
    except GoogleCalendarNotConnected as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(err)) from err
    except httpx.HTTPError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Error hablando con Google Calendar: {err}") from err

    if event_id != service.google_event_id:
        service.google_event_id = event_id
        db.commit()
        db.refresh(service)


def _get_client(db: Session, client_id: uuid.UUID) -> Client:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
    return client


def _serialize_service(service: ClientService) -> ClientServiceOut:
    item = ClientServiceOut.model_validate(service)
    item.client_name = service.client.name if service.client else None
    return item


def _serialize_invoice(invoice: Invoice) -> InvoiceOut:
    item = InvoiceOut.model_validate(invoice)
    item.client_name = invoice.client.name if invoice.client else None
    return item


@router.get("/clients", response_model=list[ClientOut])
def list_clients(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(Client).order_by(Client.name.asc())))


@router.post("/clients", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.patch("/clients/{client_id}", response_model=ClientOut)
def update_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    client = _get_client(db, client_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    client = _get_client(db, client_id)
    db.delete(client)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "El cliente tiene facturas o servicios asociados, no se puede borrar",
        ) from None


@router.get("/clients/{client_id}/services", response_model=list[ClientServiceOut])
def list_client_services(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    _get_client(db, client_id)
    services = db.scalars(
        select(ClientService)
        .where(ClientService.client_id == client_id)
        .order_by(ClientService.proxima_fecha_vencimiento.asc().nulls_last())
    )
    return [_serialize_service(s) for s in services]


@router.get("/clients/{client_id}/invoices", response_model=list[InvoiceOut])
def list_client_invoices(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    _get_client(db, client_id)
    invoices = db.scalars(
        select(Invoice).where(Invoice.client_id == client_id).order_by(Invoice.fecha.desc())
    )
    return [_serialize_invoice(i) for i in invoices]


@router.post(
    "/clients/{client_id}/services",
    response_model=ClientServiceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_client_service(
    client_id: uuid.UUID,
    payload: ClientServiceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    _get_client(db, client_id)
    service = ClientService(**payload.model_dump(), client_id=client_id)
    db.add(service)
    db.commit()
    db.refresh(service)
    if service.calendar_sync != "off" and service.proxima_fecha_vencimiento:
        _sync_service_calendar(db, service, previous_sync="off")
    return _serialize_service(service)


@router.post("/client-services/{service_id}/agendar", response_model=ClientServiceOut)
def agendar_client_service(
    service_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = db.get(ClientService, service_id)
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
    if not service.proxima_fecha_vencimiento:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El servicio no tiene proxima fecha de vencimiento")
    try:
        event_id = crear_evento(
            get_calendar_admin(db),
            title=_service_title(service),
            due_date=service.proxima_fecha_vencimiento,
            recurrence=_service_recurrence(service),
        )
    except GoogleCalendarNotConnected as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(err)) from err
    except httpx.HTTPError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Error hablando con Google Calendar: {err}") from err
    service.google_event_id = event_id
    db.commit()
    db.refresh(service)
    return _serialize_service(service)


@router.patch("/client-services/{service_id}", response_model=ClientServiceOut)
def update_client_service(
    service_id: uuid.UUID,
    payload: ClientServiceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = db.get(ClientService, service_id)
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
    changes = payload.model_dump(exclude_unset=True)
    previous_sync = service.calendar_sync
    for field, value in changes.items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)

    if changes.keys() & {"calendar_sync", "proxima_fecha_vencimiento", "servicio", "recurrencia"}:
        _sync_service_calendar(db, service, previous_sync)

    return _serialize_service(service)


@router.delete("/client-services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_service(
    service_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = db.get(ClientService, service_id)
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
    try:
        sync_recurring_on_delete(db, google_event_id=service.google_event_id)
    except (GoogleCalendarNotConnected, httpx.HTTPError):
        pass
    db.delete(service)
    db.commit()


@router.get("/client-services/pipeline", response_model=ClientServicesPipeline)
def client_services_pipeline(
    dias: int = Query(default=15, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    limite = date.today() + timedelta(days=dias)
    services = db.scalars(
        select(ClientService)
        .where(
            ClientService.estado == "activo",
            ClientService.proxima_fecha_vencimiento.is_not(None),
            ClientService.proxima_fecha_vencimiento <= limite,
        )
        .order_by(ClientService.proxima_fecha_vencimiento.asc())
    )
    return ClientServicesPipeline(services=[_serialize_service(s) for s in services])
