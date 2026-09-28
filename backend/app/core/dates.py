from datetime import date

from fastapi import HTTPException, status


def parse_month_range(mes: str | None) -> tuple[date, date, str]:
    """Convierte "YYYY-MM" en (inicio, fin_exclusivo, "YYYY-MM"). Sin `mes`, usa el actual."""
    if mes is None:
        today = date.today()
        mes = f"{today.year:04d}-{today.month:02d}"
    try:
        year, month = (int(part) for part in mes.split("-"))
        if month < 1 or month > 12:
            raise ValueError
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "mes debe tener formato YYYY-MM") from None

    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end, mes
