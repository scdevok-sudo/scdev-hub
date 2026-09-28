import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.pricing import simular
from app.models import CatalogPreset, Client, HostingTier, PricingConfig, User
from app.schemas import (
    CatalogPresetCreate,
    CatalogPresetOut,
    CatalogPresetUpdate,
    HostingTierCreate,
    HostingTierOut,
    HostingTierUpdate,
    PricingConfigOut,
    PricingConfigUpdate,
    SimularOut,
    SimularRequest,
)

router = APIRouter(tags=["pricing"])


def _get_config(db: Session) -> PricingConfig:
    config = db.scalar(select(PricingConfig).limit(1))
    if not config:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "pricing_config no tiene fila (correr migracion 007)")
    return config


# ------------------------------------------------------------------ Pricing config

@router.get("/pricing-config", response_model=PricingConfigOut)
def get_pricing_config(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _get_config(db)


@router.patch("/pricing-config", response_model=PricingConfigOut)
def update_pricing_config(
    payload: PricingConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    config = _get_config(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    db.commit()
    db.refresh(config)
    return config


# ------------------------------------------------------------------ Catalog presets

@router.get("/catalog-presets", response_model=list[CatalogPresetOut])
def list_catalog_presets(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(CatalogPreset).order_by(CatalogPreset.nombre.asc())))


@router.post("/catalog-presets", response_model=CatalogPresetOut, status_code=status.HTTP_201_CREATED)
def create_catalog_preset(
    payload: CatalogPresetCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    preset = CatalogPreset(**payload.model_dump())
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.patch("/catalog-presets/{preset_id}", response_model=CatalogPresetOut)
def update_catalog_preset(
    preset_id: uuid.UUID,
    payload: CatalogPresetUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    preset = db.get(CatalogPreset, preset_id)
    if not preset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Preset no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(preset, field, value)
    db.commit()
    db.refresh(preset)
    return preset


@router.delete("/catalog-presets/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catalog_preset(
    preset_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    preset = db.get(CatalogPreset, preset_id)
    if not preset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Preset no encontrado")
    db.delete(preset)
    db.commit()


# -------------------------------------------------------------------- Hosting tiers

@router.get("/hosting-tiers", response_model=list[HostingTierOut])
def list_hosting_tiers(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(HostingTier).order_by(HostingTier.orden.asc())))


@router.post("/hosting-tiers", response_model=HostingTierOut, status_code=status.HTTP_201_CREATED)
def create_hosting_tier(
    payload: HostingTierCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    tier = HostingTier(**payload.model_dump())
    db.add(tier)
    db.commit()
    db.refresh(tier)
    return tier


@router.patch("/hosting-tiers/{tier_id}", response_model=HostingTierOut)
def update_hosting_tier(
    tier_id: uuid.UUID,
    payload: HostingTierUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    tier = db.get(HostingTier, tier_id)
    if not tier:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tramo de hosting no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tier, field, value)
    db.commit()
    db.refresh(tier)
    return tier


@router.delete("/hosting-tiers/{tier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hosting_tier(
    tier_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    tier = db.get(HostingTier, tier_id)
    if not tier:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tramo de hosting no encontrado")
    db.delete(tier)
    db.commit()


# ------------------------------------------------------------------------ Simulador

@router.post("/calculadora/simular", response_model=SimularOut)
def simular_presupuesto(
    payload: SimularRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    config = _get_config(db)

    preset = db.get(CatalogPreset, payload.preset_id) if payload.preset_id else None
    if payload.preset_id and not preset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Preset no encontrado")

    tarifa_hora = payload.tarifa_hora if payload.tarifa_hora is not None else config.tarifa_hora_estandar
    horas = payload.horas if payload.horas is not None else (preset.horas_estimadas if preset else None)

    if preset and preset.tipo_precio == "fijo" and preset.precio_fijo is not None:
        subtotal = preset.precio_fijo
    elif horas is not None:
        subtotal = horas * tarifa_hora
    else:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Necesito un preset con precio fijo, o bien horas (propias o del preset) para calcular el subtotal",
        )

    hosting_mensual = Decimal("0")
    if payload.incluir_hosting_tier_id:
        tier = db.get(HostingTier, payload.incluir_hosting_tier_id)
        if not tier:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tramo de hosting no encontrado")
        hosting_mensual = tier.precio_mensual

    descuento_pct = Decimal("0")
    if payload.alianza_balance:
        descuento_pct = (
            payload.descuento_alianza_pct
            if payload.descuento_alianza_pct is not None
            else (config.descuento_alianza_balance_max or Decimal("0"))
        )

    cliente_nombre = None
    if payload.cliente_id:
        cliente = db.get(Client, payload.cliente_id)
        if not cliente:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
        cliente_nombre = cliente.name

    result = simular(
        subtotal=float(subtotal),
        hosting_mensual=float(hosting_mensual),
        gastos_directos=float(payload.gastos_directos),
        tasa_iibb=float(config.tasa_iibb),
        alianza_balance=payload.alianza_balance,
        descuento_alianza_pct=float(descuento_pct),
    )

    return SimularOut(
        subtotal=result.subtotal,
        subtotal_con_hosting=result.subtotal_con_hosting,
        descuento=result.descuento,
        descuento_pct_aplicado=float(descuento_pct) if payload.alianza_balance else 0.0,
        base=result.base,
        iibb=result.iibb,
        total=result.total,
        margen_pct=result.margen_pct,
        cliente_nombre=cliente_nombre,
    )
