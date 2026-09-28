import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)
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
