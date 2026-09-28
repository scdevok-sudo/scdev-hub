import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import parse_month_range
from app.core.deps import require_admin
from app.models import Client, Invoice, Project, User
from app.schemas import InvoiceCreate, InvoiceOut, InvoicesPipeline, InvoicesResumen, InvoiceUpdate

router = APIRouter(prefix="/invoices", tags=["finance"])


def _serialize(invoice: Invoice) -> InvoiceOut:
    item = InvoiceOut.model_validate(invoice)
    item.client_name = invoice.client.name if invoice.client else None
    return item


@router.get("", response_model=list[InvoiceOut])
def list_invoices(
    client_id: uuid.UUID | None = None,
    estado: str | None = None,
    mes: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(Invoice)
    if client_id:
        stmt = stmt.where(Invoice.client_id == client_id)
    if estado:
        stmt = stmt.where(Invoice.estado == estado)
    if mes:
        start, end, _mes = parse_month_range(mes)
        stmt = stmt.where(Invoice.fecha >= start, Invoice.fecha < end)
    stmt = stmt.order_by(Invoice.fecha.desc())
    return [_serialize(i) for i in db.scalars(stmt)]


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not db.get(Client, payload.client_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
    if payload.project_id and not db.get(Project, payload.project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")

    data = payload.model_dump()
    anticipo = data.pop("anticipo") or Decimal("0")
    invoice = Invoice(
        **data,
        anticipo=anticipo,
        saldo_pendiente=payload.monto - anticipo,
        created_by=admin.id,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return _serialize(invoice)


@router.patch("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: uuid.UUID,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura no encontrada")

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(invoice, field, value)

    # Accion rapida "marcar cobrado": si el frontend solo manda el estado,
    # el saldo pendiente se salda solo (una sola fuente de verdad).
    if changes.get("estado") == "cobrado" and "saldo_pendiente" not in changes:
        invoice.saldo_pendiente = Decimal("0")

    db.commit()
    db.refresh(invoice)
    return _serialize(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Factura no encontrada")
    db.delete(invoice)
    db.commit()


@router.get("/pipeline", response_model=InvoicesPipeline)
def invoices_pipeline(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Mismo criterio que getPipeline() del Apps Script viejo: estado pendiente/parcial,
    sin filtrar por fecha_seguimiento (asi era el original)."""
    invoices = list(
        db.scalars(
            select(Invoice)
            .where(Invoice.estado.in_(["pendiente", "parcial"]))
            .order_by(Invoice.fecha_seguimiento.asc().nulls_last())
        )
    )
    total = sum((inv.saldo_pendiente or Decimal("0") for inv in invoices), Decimal("0"))
    return InvoicesPipeline(invoices=[_serialize(i) for i in invoices], total_saldo_pendiente=float(total))


@router.get("/resumen", response_model=InvoicesResumen)
def invoices_resumen(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    start, end, mes_resuelto = parse_month_range(mes)
    row = db.execute(
        select(
            func.coalesce(func.sum(Invoice.monto), 0),
            func.coalesce(func.sum(Invoice.iibb), 0),
            func.coalesce(func.sum(Invoice.neto), 0),
            func.count(Invoice.id),
        ).where(Invoice.fecha >= start, Invoice.fecha < end)
    ).one()
    facturado, iibb, neto, cantidad = row
    return InvoicesResumen(
        mes=mes_resuelto,
        facturado=float(facturado),
        iibb=float(iibb),
        neto=float(neto),
        cantidad_facturas=int(cantidad),
    )
