import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

# ------------------------------------------------------------------ Pricing config

class PricingConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tarifa_hora_estandar: Decimal
    tarifa_hora_scope_creep: Decimal
    tasa_iibb: Decimal
    dolar_oficial: Decimal | None = None
    descuento_alianza_balance_min: Decimal | None = None
    descuento_alianza_balance_max: Decimal | None = None
    updated_at: datetime | None = None


class PricingConfigUpdate(BaseModel):
    tarifa_hora_estandar: Decimal | None = None
    tarifa_hora_scope_creep: Decimal | None = None
    tasa_iibb: Decimal | None = None
    dolar_oficial: Decimal | None = None
    descuento_alianza_balance_min: Decimal | None = None
    descuento_alianza_balance_max: Decimal | None = None


# ------------------------------------------------------------------ Catalog presets

class CatalogPresetCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    tipo_precio: str
    precio_fijo: Decimal | None = None
    horas_estimadas: Decimal | None = None
    activo: bool = True


class CatalogPresetUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    tipo_precio: str | None = None
    precio_fijo: Decimal | None = None
    horas_estimadas: Decimal | None = None
    activo: bool | None = None


class CatalogPresetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre: str
    tipo_precio: str
    precio_fijo: Decimal | None = None
    horas_estimadas: Decimal | None = None
    activo: bool | None = None


# -------------------------------------------------------------------- Hosting tiers

class HostingTierCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    precio_mensual: Decimal
    orden: int = 0


class HostingTierUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    precio_mensual: Decimal | None = None
    orden: int | None = None


class HostingTierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre: str
    precio_mensual: Decimal
    orden: int | None = None


# ------------------------------------------------------------------------ Simulador

class SimularRequest(BaseModel):
    preset_id: uuid.UUID | None = None
    horas: Decimal | None = None
    tarifa_hora: Decimal | None = None
    gastos_directos: Decimal = Decimal("0")
    incluir_hosting_tier_id: uuid.UUID | None = None
    alianza_balance: bool = False
    # Opcional: permite elegir un punto dentro del rango [min, max] configurado.
    # Sin este campo, se usa descuento_alianza_balance_max cuando alianza_balance=true.
    descuento_alianza_pct: Decimal | None = None
    cliente_id: uuid.UUID | None = None


class SimularOut(BaseModel):
    subtotal: float
    subtotal_con_hosting: float
    descuento: float
    descuento_pct_aplicado: float
    base: float
    iibb: float
    total: float
    margen_pct: float
    cliente_nombre: str | None = None
