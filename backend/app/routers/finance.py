import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dates import default_mes_aplicacion, parse_month_range
from app.core.deps import require_admin
from app.models import ExpenseLog, Invoice, PersonalIncome, RecurringExpense, User
from app.schemas import (
    ExpenseLogCreate,
    ExpenseLogOut,
    FinanceResumenAgencia,
    FinanceResumenPersonal,
    PersonalIncomeCreate,
    PersonalIncomeOut,
    PersonalIncomeUpdate,
    RecurringExpenseCreate,
    RecurringExpenseOut,
    RecurringExpenseUpdate,
)

router = APIRouter(tags=["finance"])


# ------------------------------------------------------------ Recurring expenses

@router.get("/recurring-expenses", response_model=list[RecurringExpenseOut])
def list_recurring_expenses(
    tipo: str | None = Query(default=None, pattern="^(personal|agencia)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(RecurringExpense)
    if tipo:
        stmt = stmt.where(RecurringExpense.tipo == tipo)
    stmt = stmt.order_by(RecurringExpense.concepto.asc())
    return list(db.scalars(stmt))


@router.post(
    "/recurring-expenses", response_model=RecurringExpenseOut, status_code=status.HTTP_201_CREATED
)
def create_recurring_expense(
    payload: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    expense = RecurringExpense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/recurring-expenses/{expense_id}", response_model=RecurringExpenseOut)
def update_recurring_expense(
    expense_id: uuid.UUID,
    payload: RecurringExpenseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    expense = db.get(RecurringExpense, expense_id)
    if not expense:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gasto recurrente no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/recurring-expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_expense(
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    expense = db.get(RecurringExpense, expense_id)
    if not expense:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gasto recurrente no encontrado")
    db.delete(expense)
    db.commit()


# ------------------------------------------------------------------- Expense log

@router.get("/expense-log", response_model=list[ExpenseLogOut])
def list_expense_log(
    tipo: str | None = Query(default=None, pattern="^(personal|agencia)$"),
    desde: date | None = None,
    hasta: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(ExpenseLog)
    if tipo:
        stmt = stmt.where(ExpenseLog.tipo == tipo)
    if desde:
        stmt = stmt.where(ExpenseLog.fecha >= desde)
    if hasta:
        stmt = stmt.where(ExpenseLog.fecha <= hasta)
    stmt = stmt.order_by(ExpenseLog.fecha.desc())
    return list(db.scalars(stmt))


@router.post("/expense-log", response_model=ExpenseLogOut, status_code=status.HTTP_201_CREATED)
def create_expense_log(
    payload: ExpenseLogCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    entry = ExpenseLog(**payload.model_dump(), created_by=admin.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/expense-log/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_log(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    entry = db.get(ExpenseLog, entry_id)
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gasto no encontrado")
    db.delete(entry)
    db.commit()


# --------------------------------------------------------------- Personal income

@router.get("/personal-income", response_model=list[PersonalIncomeOut])
def list_personal_income(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    stmt = select(PersonalIncome).order_by(PersonalIncome.fecha.desc())
    return list(db.scalars(stmt))


@router.post(
    "/personal-income", response_model=PersonalIncomeOut, status_code=status.HTTP_201_CREATED
)
def create_personal_income(
    payload: PersonalIncomeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    data = payload.model_dump()
    if data["mes_aplicacion"] is None:
        data["mes_aplicacion"] = default_mes_aplicacion(data["fecha"], data["a_mes_vencido"])
    income = PersonalIncome(**data, created_by=admin.id)
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.patch("/personal-income/{income_id}", response_model=PersonalIncomeOut)
def update_personal_income(
    income_id: uuid.UUID,
    payload: PersonalIncomeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    income = db.get(PersonalIncome, income_id)
    if not income:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ingreso no encontrado")
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(income, field, value)
    # Si cambia la fecha o el flag y no se fijo mes_aplicacion a mano, se recalcula.
    if changes.keys() & {"fecha", "a_mes_vencido"} and not changes.get("mes_aplicacion"):
        income.mes_aplicacion = default_mes_aplicacion(income.fecha, income.a_mes_vencido)
    db.commit()
    db.refresh(income)
    return income


@router.delete("/personal-income/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personal_income(
    income_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    income = db.get(PersonalIncome, income_id)
    if not income:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ingreso no encontrado")
    db.delete(income)
    db.commit()


# ------------------------------------------------------------- Resumenes combinados

def _recurring_total(db: Session, tipo: str) -> Decimal:
    return db.scalar(
        select(func.coalesce(func.sum(RecurringExpense.monto), 0)).where(
            RecurringExpense.tipo == tipo, RecurringExpense.activo.is_(True)
        )
    ) or Decimal("0")


def _expense_log_total(db: Session, tipo: str, rango: tuple[date, date] | None) -> Decimal:
    stmt = select(func.coalesce(func.sum(ExpenseLog.monto), 0)).where(ExpenseLog.tipo == tipo)
    if rango:
        stmt = stmt.where(ExpenseLog.fecha >= rango[0], ExpenseLog.fecha < rango[1])
    return db.scalar(stmt) or Decimal("0")


def _resolve_period(mes: str | None) -> tuple[tuple[date, date] | None, str | None]:
    """Sin `mes` = historico (sin filtro de fecha). Con `mes` = (inicio, fin_exclusivo)."""
    if mes is None:
        return None, None
    start, end, mes_resuelto = parse_month_range(mes)
    return (start, end), mes_resuelto


# Nota: `recurring_expenses` es el catalogo de obligaciones mensuales vigentes, no un
# libro de pagos. Por eso su total es la misma "carga mensual vigente" en historico y en mes.

@router.get("/finance/resumen-agencia", response_model=FinanceResumenAgencia)
def resumen_agencia(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    rango, mes_resuelto = _resolve_period(mes)
    stmt = select(
        func.coalesce(func.sum(Invoice.monto), 0),
        func.coalesce(func.sum(Invoice.iibb), 0),
        func.coalesce(func.sum(Invoice.neto), 0),
    )
    if rango:
        stmt = stmt.where(Invoice.fecha >= rango[0], Invoice.fecha < rango[1])
    facturado, iibb, neto = db.execute(stmt).one()
    neto = Decimal(neto)
    gastos_agencia = _recurring_total(db, "agencia") + _expense_log_total(db, "agencia", rango)
    return FinanceResumenAgencia(
        mes=mes_resuelto,
        facturado=float(facturado),
        iibb=float(iibb),
        neto=float(neto),
        gastos_agencia=float(gastos_agencia),
        ganancia=float(neto - gastos_agencia),
    )


@router.get("/finance/resumen-personal", response_model=FinanceResumenPersonal)
def resumen_personal(
    mes: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    rango, mes_resuelto = _resolve_period(mes)
    stmt = select(func.coalesce(func.sum(PersonalIncome.monto), 0))
    if rango:
        # Los ingresos cuentan en `mes_aplicacion` (no en `fecha`): el sueldo cobrado
        # a fin de mes es el presupuesto del mes siguiente.
        stmt = stmt.where(PersonalIncome.mes_aplicacion >= rango[0], PersonalIncome.mes_aplicacion < rango[1])
    ingresos = Decimal(db.scalar(stmt) or 0)
    gastos = _recurring_total(db, "personal") + _expense_log_total(db, "personal", rango)
    return FinanceResumenPersonal(
        mes=mes_resuelto,
        ingresos=float(ingresos),
        gastos=float(gastos),
        balance=float(ingresos - gastos),
    )
