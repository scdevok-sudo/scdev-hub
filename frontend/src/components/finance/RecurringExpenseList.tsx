import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { deleteRecurringExpense, updateRecurringExpense, useRecurringExpenses } from '@/hooks/useFinance'
import { formatMoney } from '@/lib/utils'
import type { GastoTipo, RecurringExpense } from '@/types'

const montoInputClass =
  'w-28 rounded-md border border-line bg-graphite2 px-2 py-1.5 text-xs text-txt focus:border-red focus:outline-none'

export function RecurringExpenseList({ tipo, refreshKey }: { tipo: GastoTipo; refreshKey: number }) {
  const { data: expenses, loading, error, reload } = useRecurringExpenses(tipo)
  const [savingId, setSavingId] = useState<string | null>(null)

  // refreshKey cambia cuando se crea un gasto recurrente desde el modal compartido.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    reload()
  }, [refreshKey])

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} />
  if (!expenses || expenses.length === 0) {
    return <EmptyState title="Sin gastos fijos" description="Todavia no hay gastos recurrentes cargados." />
  }

  const saveMonto = async (id: string, monto: number) => {
    setSavingId(id)
    try {
      await updateRecurringExpense(id, { monto })
      reload()
    } finally {
      setSavingId(null)
    }
  }

  const onDelete = async (id: string) => {
    await deleteRecurringExpense(id)
    reload()
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.monto), 0)

  return (
    <>
      {/* Mobile: card por gasto. */}
      <div className="space-y-2 md:hidden">
        {expenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            saving={savingId === expense.id}
            onSaveMonto={saveMonto}
            onDelete={onDelete}
          />
        ))}
        <div className="flex items-center justify-between rounded-xl border border-line bg-graphite2/40 px-3 py-2">
          <span className="text-xs font-medium text-txt2">Total mensual</span>
          <span className="text-xs font-semibold text-txt">{formatMoney(total)}</span>
        </div>
      </div>

      {/* Desktop: tabla clasica. */}
      <div className="hidden overflow-hidden rounded-xl border border-line md:block">
        <table className="w-full text-sm">
          <thead className="bg-graphite text-left text-[11px] uppercase tracking-wide text-txt3">
            <tr>
              <th className="px-4 py-2.5">Concepto</th>
              <th className="px-4 py-2.5">Categoria</th>
              <th className="px-4 py-2.5">Monto</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-4 py-2.5 text-txt">{expense.concepto}</td>
                <td className="px-4 py-2.5 text-txt2">{expense.categoria ?? '-'}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={expense.monto}
                    disabled={savingId === expense.id}
                    onBlur={(e) => {
                      const value = Number(e.target.value)
                      if (!Number.isNaN(value) && value !== Number(expense.monto)) {
                        void saveMonto(expense.id, value)
                      }
                    }}
                    className={montoInputClass}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    aria-label="Borrar gasto recurrente"
                    onClick={() => onDelete(expense.id)}
                    className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-red-dim hover:text-red"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line bg-graphite px-4 py-2 text-right text-xs text-txt2">
          Total mensual: {formatMoney(total)}
        </p>
      </div>
    </>
  )
}

function ExpenseRow({
  expense,
  saving,
  onSaveMonto,
  onDelete,
}: {
  expense: RecurringExpense
  saving: boolean
  onSaveMonto: (id: string, monto: number) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-graphite p-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-txt">{expense.concepto}</p>
        {expense.categoria && <p className="text-[11px] text-txt3">{expense.categoria}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          min={0}
          step="0.01"
          defaultValue={expense.monto}
          disabled={saving}
          onBlur={(e) => {
            const value = Number(e.target.value)
            if (!Number.isNaN(value) && value !== Number(expense.monto)) onSaveMonto(expense.id, value)
          }}
          className={montoInputClass}
        />
        <button
          aria-label="Borrar gasto recurrente"
          onClick={() => onDelete(expense.id)}
          className="rounded-md p-2 text-txt3 transition-colors hover:bg-red-dim hover:text-red"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
