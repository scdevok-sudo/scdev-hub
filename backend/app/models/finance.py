import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Computed, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = (
        CheckConstraint(
            "estado_pago in ('al_dia', 'pendiente', 'atrasado')", name="clients_estado_pago_check"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    rubro: Mapped[str | None] = mapped_column(Text)
    ubicacion: Mapped[str | None] = mapped_column(Text)
    telefono: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    instagram: Mapped[str | None] = mapped_column(Text)
    web: Mapped[str | None] = mapped_column(Text)
    estado_pago: Mapped[str] = mapped_column(String, nullable=False, server_default="al_dia")
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("estado in ('pendiente', 'parcial', 'cobrado')", name="invoices_estado_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    servicio: Mapped[str | None] = mapped_column(Text)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # Generadas por Postgres (GENERATED ALWAYS AS ... STORED, migracion 005).
    # `Computed(...)` le dice al ORM que son de solo lectura: nunca las incluye
    # en INSERT/UPDATE (Postgres rechaza cualquier intento de escribirlas).
    # La expresion es solo documentacion aca -- la definicion real vive en la
    # migracion, esto no se usa para generar DDL porque la tabla ya existe.
    iibb: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), Computed("monto * (0.05 / 0.95)")
    )
    neto: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), Computed("monto - monto * (0.05 / 0.95)")
    )
    anticipo: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), server_default="0")
    saldo_pendiente: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), server_default="0")
    estado: Mapped[str] = mapped_column(String, nullable=False, server_default="pendiente")
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_seguimiento: Mapped[date | None] = mapped_column(Date)
    notas: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", lazy="joined")
    project = relationship("Project", lazy="joined")


class ClientService(Base):
    __tablename__ = "client_services"
    __table_args__ = (
        CheckConstraint("recurrencia in ('mensual', 'anual', 'unico')", name="client_services_recurrencia_check"),
        CheckConstraint("estado in ('activo', 'pausado', 'cancelado')", name="client_services_estado_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    servicio: Mapped[str] = mapped_column(Text, nullable=False)
    monto_mensual: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    fecha_inicio: Mapped[date | None] = mapped_column(Date)
    proxima_fecha_vencimiento: Mapped[date | None] = mapped_column(Date)
    recurrencia: Mapped[str] = mapped_column(String, nullable=False, server_default="mensual")
    estado: Mapped[str] = mapped_column(String, nullable=False, server_default="activo")

    client = relationship("Client", lazy="joined")


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"
    __table_args__ = (
        CheckConstraint("tipo in ('personal', 'agencia')", name="recurring_expenses_tipo_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    concepto: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str | None] = mapped_column(Text)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tipo: Mapped[str] = mapped_column(String, nullable=False)
    frecuencia: Mapped[str | None] = mapped_column(String, server_default="mensual")
    activo: Mapped[bool] = mapped_column(server_default="true")


class ExpenseLog(Base):
    __tablename__ = "expense_log"
    __table_args__ = (
        CheckConstraint("tipo in ('personal', 'agencia')", name="expense_log_tipo_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    concepto: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str | None] = mapped_column(Text)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tipo: Mapped[str] = mapped_column(String, nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))


class PersonalIncome(Base):
    __tablename__ = "personal_income"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    concepto: Mapped[str] = mapped_column(Text, nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    recurrente: Mapped[bool | None] = mapped_column(server_default="false")
    fuente: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
