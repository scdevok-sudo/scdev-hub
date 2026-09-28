import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PricingConfig(Base):
    __tablename__ = "pricing_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tarifa_hora_estandar: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default="15000")
    tarifa_hora_scope_creep: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default="25000")
    tasa_iibb: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, server_default="0.05")
    dolar_oficial: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    descuento_alianza_balance_min: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), server_default="0.10")
    descuento_alianza_balance_max: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), server_default="0.15")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CatalogPreset(Base):
    __tablename__ = "catalog_presets"
    __table_args__ = (
        CheckConstraint("tipo_precio in ('fijo', 'por_hora')", name="catalog_presets_tipo_precio_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    tipo_precio: Mapped[str] = mapped_column(String, nullable=False)
    precio_fijo: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    horas_estimadas: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    activo: Mapped[bool | None] = mapped_column(Boolean, server_default="true")


class HostingTier(Base):
    __tablename__ = "hosting_tiers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    precio_mensual: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    orden: Mapped[int | None] = mapped_column(Integer, server_default="0")
