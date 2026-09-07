"""Reparto económico por proyecto.

Reglas (documento de negocio):
    distributable = billed_amount * (1 - structure_pct)
    payout_user   = (user_hours / total_project_hours) * distributable

`structure_pct` se lee SIEMPRE del proyecto — nunca se hardcodea 0.25.
"""

import uuid
from decimal import Decimal


def distributable_amount(billed_amount: Decimal | float | None, structure_pct: Decimal | float) -> float:
    billed = float(billed_amount or 0)
    pct = float(structure_pct or 0)
    return billed * (1 - pct)


def payout_for(user_hours: float, total_hours: float, distributable: float) -> float:
    if total_hours <= 0:
        return 0.0
    return (user_hours / total_hours) * distributable


def split_by_user(
    hours_by_user: dict[uuid.UUID, float],
    billed_amount: Decimal | float | None,
    structure_pct: Decimal | float,
) -> tuple[float, float, dict[uuid.UUID, tuple[float, float]]]:
    """Devuelve (total_hours, distributable, {user_id: (share_pct, payout)})."""
    total_hours = sum(hours_by_user.values())
    distributable = distributable_amount(billed_amount, structure_pct)
    rows = {
        user_id: (
            (hours / total_hours) if total_hours > 0 else 0.0,
            payout_for(hours, total_hours, distributable),
        )
        for user_id, hours in hours_by_user.items()
    }
    return total_hours, distributable, rows
