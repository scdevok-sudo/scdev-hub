import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { PersonalIncomeForm } from '@/components/forms/PersonalIncomeForm'
import { deletePersonalIncome, usePersonalIncome } from '@/hooks/useFinance'
import { formatDate, formatMoney } from '@/lib/utils'
import type { PersonalIncome } from '@/types'

export function PersonalIncomeTable() {
  const { data: incomes, loading, error, reload } = usePersonalIncome()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PersonalIncome | null>(null)

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Nuevo ingreso
        </Button>
      </div>

      {incomes?.length === 0 ? (
        <EmptyState title="Sin ingresos" description="Cargá tus ingresos personales, como el sueldo de la pasantia." />
      ) : (
        <>
          {/* Mobile: card por ingreso. */}
          <div className="space-y-2 md:hidden">
            {incomes?.map((income) => (
              <div key={income.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-graphite p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-txt">
                    {income.concepto}
                    {income.recurrente && <span className="ml-1.5 text-[11px] text-txt3">(recurrente)</span>}
                  </p>
                  <p className="text-[11px] text-txt3">
                    {formatDate(income.fecha)}
                    {income.fuente ? ` · ${income.fuente}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 text-sm text-txt">{formatMoney(income.monto)}</span>
                  <button
                    aria-label="Editar ingreso"
                    onClick={() => {
                      setEditing(income)
                      setFormOpen(true)
                    }}
                    className="rounded-md p-2 text-txt3 hover:bg-graphite2 hover:text-txt"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    aria-label="Borrar ingreso"
                    onClick={async () => {
                      await deletePersonalIncome(income.id)
                      reload()
                    }}
                    className="rounded-md p-2 text-txt3 hover:bg-red-dim hover:text-red"
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
                  <th className="px-4 py-2.5">Fuente</th>
                  <th className="px-4 py-2.5">Monto</th>
                  <th className="w-16 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {incomes?.map((income) => (
                  <tr key={income.id}>
                    <td className="px-4 py-2.5 text-txt2">{formatDate(income.fecha)}</td>
                    <td className="px-4 py-2.5 text-txt">
                      {income.concepto}
                      {income.recurrente && <span className="ml-1.5 text-[11px] text-txt3">(recurrente)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-txt2">{income.fuente ?? '-'}</td>
                    <td className="px-4 py-2.5 text-txt">{formatMoney(income.monto)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          aria-label="Editar ingreso"
                          onClick={() => {
                            setEditing(income)
                            setFormOpen(true)
                          }}
                          className="text-txt3 hover:text-txt"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          aria-label="Borrar ingreso"
                          onClick={async () => {
                            await deletePersonalIncome(income.id)
                            reload()
                          }}
                          className="text-txt3 hover:text-red"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PersonalIncomeForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} income={editing} />
    </div>
  )
}
