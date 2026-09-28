"""Simulacion de la calculadora de precio (no persiste nada).

Formula (documento de negocio, fase-2c-calculadora-precio.md):
    subtotal              = preset.precio_fijo | (horas * tarifa_hora)
    subtotal_con_hosting  = subtotal + hosting_tier.precio_mensual (si aplica)
    descuento             = subtotal_con_hosting * descuento_alianza (si alianza_balance)
    base                  = subtotal_con_hosting - descuento + gastos_directos
    iibb                  = base * (tasa_iibb / (1 - tasa_iibb))
    total                 = base + iibb
    margen_pct            = (base - gastos_directos) / total * 100
"""

from dataclasses import dataclass


@dataclass
class SimulacionResult:
    subtotal: float
    subtotal_con_hosting: float
    descuento: float
    base: float
    iibb: float
    total: float
    margen_pct: float


def simular(
    *,
    subtotal: float,
    hosting_mensual: float,
    gastos_directos: float,
    tasa_iibb: float,
    alianza_balance: bool,
    descuento_alianza_pct: float,
) -> SimulacionResult:
    subtotal_con_hosting = subtotal + hosting_mensual
    descuento = subtotal_con_hosting * descuento_alianza_pct if alianza_balance else 0.0
    base = subtotal_con_hosting - descuento + gastos_directos
    iibb = base * (tasa_iibb / (1 - tasa_iibb)) if tasa_iibb < 1 else 0.0
    total = base + iibb
    margen_pct = ((base - gastos_directos) / total * 100) if total > 0 else 0.0

    return SimulacionResult(
        subtotal=subtotal,
        subtotal_con_hosting=subtotal_con_hosting,
        descuento=descuento,
        base=base,
        iibb=iibb,
        total=total,
        margen_pct=margen_pct,
    )
