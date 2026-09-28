import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.task import CalendarSync

# ---------------------------------------------------------------- Clients

class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    rubro: str | None = None
    ubicacion: str | None = None
    telefono: str | None = None
    email: str | None = None
    instagram: str | None = None
    web: str | None = None
    estado_pago: str = "al_dia"
    notas: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    rubro: str | None = None
    ubicacion: str | None = None
    telefono: str | None = None
    email: str | None = None
    instagram: str | None = None
    web: str | None = None
    estado_pago: str | None = None
    notas: str | None = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    rubro: str | None = None
    ubicacion: str | None = None
    telefono: str | None = None
    email: str | None = None
    instagram: str | None = None
    web: str | None = None
    estado_pago: str
    notas: str | None = None
    created_at: datetime | None = None


# ---------------------------------------------------------- Client services

class ClientServiceCreate(BaseModel):
    servicio: str = Field(min_length=1, max_length=200)
    monto_mensual: Decimal | None = None
    fecha_inicio: date | None = None
    proxima_fecha_vencimiento: date | None = None
    recurrencia: str = "mensual"
    estado: str = "activo"
    calendar_sync: CalendarSync = "off"


class ClientServiceUpdate(BaseModel):
    servicio: str | None = Field(default=None, min_length=1, max_length=200)
    monto_mensual: Decimal | None = None
    fecha_inicio: date | None = None
    proxima_fecha_vencimiento: date | None = None
    recurrencia: str | None = None
    estado: str | None = None
    calendar_sync: CalendarSync | None = None


class ClientServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    servicio: str
    monto_mensual: Decimal | None = None
    fecha_inicio: date | None = None
    proxima_fecha_vencimiento: date | None = None
    recurrencia: str
    estado: str
    calendar_sync: CalendarSync | None = "off"
    google_event_id: str | None = None
    client_name: str | None = None


class ClientServicesPipeline(BaseModel):
    services: list[ClientServiceOut]


# --------------------------------------------------------------- Invoices

class InvoiceCreate(BaseModel):
    client_id: uuid.UUID
    project_id: uuid.UUID | None = None
    servicio: str | None = None
    monto: Decimal
    anticipo: Decimal = Decimal("0")
    estado: str = "pendiente"
    fecha: date
    fecha_seguimiento: date | None = None
    notas: str | None = None
    calendar_sync: CalendarSync = "off"


class InvoiceUpdate(BaseModel):
    project_id: uuid.UUID | None = None
    servicio: str | None = None
    monto: Decimal | None = None
    anticipo: Decimal | None = None
    saldo_pendiente: Decimal | None = None
    estado: str | None = None
    fecha: date | None = None
    fecha_seguimiento: date | None = None
    notas: str | None = None
    calendar_sync: CalendarSync | None = None


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    project_id: uuid.UUID | None = None
    servicio: str | None = None
    monto: Decimal
    iibb: Decimal | None = None
    neto: Decimal | None = None
    anticipo: Decimal | None = None
    saldo_pendiente: Decimal | None = None
    estado: str
    fecha: date
    fecha_seguimiento: date | None = None
    notas: str | None = None
    calendar_sync: CalendarSync | None = "off"
    google_event_id: str | None = None
    created_at: datetime | None = None
    client_name: str | None = None


class InvoicesPipeline(BaseModel):
    invoices: list[InvoiceOut]
    total_saldo_pendiente: float


class InvoicesResumen(BaseModel):
    mes: str
    facturado: float
    iibb: float
    neto: float
    cantidad_facturas: int


# ----------------------------------------------------------- Gastos / ingresos

class RecurringExpenseCreate(BaseModel):
    concepto: str = Field(min_length=1, max_length=200)
    categoria: str | None = None
    monto: Decimal
    tipo: str
    frecuencia: str = "mensual"
    activo: bool = True


class RecurringExpenseUpdate(BaseModel):
    concepto: str | None = Field(default=None, min_length=1, max_length=200)
    categoria: str | None = None
    monto: Decimal | None = None
    frecuencia: str | None = None
    activo: bool | None = None


class RecurringExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    concepto: str
    categoria: str | None = None
    monto: Decimal
    tipo: str
    frecuencia: str | None = None
    activo: bool | None = None


class ExpenseLogCreate(BaseModel):
    fecha: date
    concepto: str = Field(min_length=1, max_length=200)
    categoria: str | None = None
    monto: Decimal
    tipo: str
    project_id: uuid.UUID | None = None


class ExpenseLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fecha: date
    concepto: str
    categoria: str | None = None
    monto: Decimal
    tipo: str
    project_id: uuid.UUID | None = None


class PersonalIncomeCreate(BaseModel):
    concepto: str = Field(min_length=1, max_length=200)
    monto: Decimal
    fecha: date
    recurrente: bool = False
    fuente: str | None = None


class PersonalIncomeUpdate(BaseModel):
    concepto: str | None = Field(default=None, min_length=1, max_length=200)
    monto: Decimal | None = None
    fecha: date | None = None
    recurrente: bool | None = None
    fuente: str | None = None


class PersonalIncomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    concepto: str
    monto: Decimal
    fecha: date
    recurrente: bool | None = None
    fuente: str | None = None


# ------------------------------------------------------- Resumenes combinados

class FinanceResumenAgencia(BaseModel):
    mes: str
    facturado: float
    iibb: float
    neto: float
    gastos_agencia: float
    ganancia: float


class FinanceResumenPersonal(BaseModel):
    mes: str
    ingresos: float
    gastos: float
    balance: float
