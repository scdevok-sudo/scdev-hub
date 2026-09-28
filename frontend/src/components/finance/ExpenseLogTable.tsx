import { useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { deleteExpenseLog, useExpenseLog } from '@/hooks/useFinance'
import { formatDate, formatMoney } from '@/lib/utils'
import type { GastoTipo } from '@/types'

export function ExpenseLogTable({ tipo, refreshKey }: { tipo: GastoTipo; refreshKey: number }) {
  const { data: entries, loading, error, reload } = useExpenseLog(tipo)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    reload()
  }, [refreshKey])

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} />
  if (!entries || entries.length === 0) {
    return <EmptyState title="Sin gastos puntuales" description="Los gastos del dia a dia aparecen aca." />
  }

  const onDelete = async (id: string) => {
    await deleteExpenseLog(id)
    reload()
  }

  return (
    <>
      {/* Mobile: card por gasto. */}
      <div className="space-y-2 md:hidden">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-graphite p-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-txt">{entry.concepto}</p>
              <p className="text-[11px] text-txt3">
                {formatDate(entry.fecha)}
                {entry.categoria ? ` · ${entry.categoria}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm text-txt">{formatMoney(entry.monto)}</span>
              <button
                aria-label="Borrar gasto"
                onClick={() => onDelete(entry.id)}
                className="rounded-md p-2 text-txt3 transition-colors hover:bg-red-dim hover:text-red"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabla clasica. */}
      <div className="hidden overflow-hidden rounded-xl border border-line md:block">
        <table className="w-full text-sm">
          <thead className="bg-graphite text-left text-[11px] uppercase tracking-wide text-txt3">
            <tr>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Concepto</th>
              <th className="px-4 py-2.5">Categoria</th>
              <th className="px-4 py-2.5">Monto</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-2.5 text-txt2">{formatDate(entry.fecha)}</td>
                <td className="px-4 py-2.5 text-txt">{entry.concepto}</td>
                <td className="px-4 py-2.5 text-txt2">{entry.categoria ?? '-'}</td>
                <td className="px-4 py-2.5 text-txt">{formatMoney(entry.monto)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    aria-label="Borrar gasto"
                    onClick={() => onDelete(entry.id)}
                    className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-red-dim hover:text-red"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
