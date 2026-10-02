import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { useClientServicesPipeline, useInvoicesPipeline, useRecurringExpenses } from '@/hooks/useFinance'
import { formatDate, formatMoney } from '@/lib/utils'
import type { GastoTipo, RecurringExpense } from '@/types'

type Item = { id: string; fecha: string; label: string; detail: string; kind: 'cobro' | 'servicio' | 'gasto' }

const WINDOW_DAYS = 30

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Misma regla que next_occurrence del backend: hoy incluido; en meses cortos, el ultimo dia.
function nextOccurrence(day: number, today = new Date()): Date {
  for (const offset of [0, 1]) {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0).getDate()
    const candidate = new Date(today.getFullYear(), today.getMonth() + offset, Math.min(day, lastDay))
    if (candidate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) return candidate
  }
  throw new Error('unreachable')
}

function expenseItems(expenses: RecurringExpense[] | null | undefined): Item[] {
  const limit = new Date()
  limit.setDate(limit.getDate() + WINDOW_DAYS)
  const limitIso = toIso(limit)
  return (expenses ?? [])
    .filter((expense) => expense.activo !== false && expense.dia_vencimiento)
    .map((expense) => ({
      id: `expense-${expense.id}`,
      fecha: toIso(nextOccurrence(expense.dia_vencimiento as number)),
      label: expense.concepto,
      detail: formatMoney(expense.monto),
      kind: 'gasto' as const,
    }))
    .filter((item) => item.fecha <= limitIso)
}

export function UpcomingList({ tipo }: { tipo: GastoTipo }) {
  return tipo === 'agencia' ? <AgenciaUpcoming /> : <PersonalUpcoming />
}

function PersonalUpcoming() {
  const { data: expenses, loading, error } = useRecurringExpenses('personal')
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} />
  return (
    <UpcomingItems
      items={expenseItems(expenses).sort((a, b) => a.fecha.localeCompare(b.fecha))}
      emptyDescription="No hay gastos personales por vencer."
    />
  )
}

function AgenciaUpcoming() {
  const { data: invoicesPipeline, loading: loadingInvoices, error: errorInvoices } = useInvoicesPipeline()
  const { data: servicesPipeline, loading: loadingServices, error: errorServices } = useClientServicesPipeline(WINDOW_DAYS)
  const { data: expenses, loading: loadingExpenses, error: errorExpenses } = useRecurringExpenses('agencia')

  if (loadingInvoices || loadingServices || loadingExpenses) return <Loading />
  if (errorInvoices) return <ErrorState message={errorInvoices} />
  if (errorServices) return <ErrorState message={errorServices} />
  if (errorExpenses) return <ErrorState message={errorExpenses} />

  const items: Item[] = [
    ...(invoicesPipeline?.invoices ?? [])
      .filter((invoice) => invoice.fecha_seguimiento)
      .map((invoice) => ({
        id: `invoice-${invoice.id}`,
        fecha: invoice.fecha_seguimiento as string,
        label: `Seguimiento de cobro · ${invoice.client_name}`,
        detail: formatMoney(invoice.saldo_pendiente),
        kind: 'cobro' as const,
      })),
    ...(servicesPipeline?.services ?? [])
      .filter((service) => service.proxima_fecha_vencimiento)
      .map((service) => ({
        id: `service-${service.id}`,
        fecha: service.proxima_fecha_vencimiento as string,
        label: `${service.servicio} · ${service.client_name}`,
        detail: service.monto_mensual != null ? formatMoney(service.monto_mensual) : '',
        kind: 'servicio' as const,
      })),
    ...expenseItems(expenses),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  return <UpcomingItems items={items} emptyDescription="No hay cobros, servicios ni gastos por vencer." />
}

function UpcomingItems({ items, emptyDescription }: { items: Item[]; emptyDescription: string }) {
  if (items.length === 0) {
    return <EmptyState title="Sin vencimientos proximos" description={emptyDescription} />
  }

  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="truncate text-txt">{item.label}</p>
            <p className="text-[11px] text-txt3">{formatDate(item.fecha)}</p>
          </div>
          <span
            className={
              item.kind === 'cobro'
                ? 'text-xs font-medium text-red'
                : item.kind === 'gasto'
                  ? 'text-xs font-medium text-amber-400'
                  : 'text-xs font-medium text-sky-400'
            }
          >
            {item.detail}
          </span>
        </li>
      ))}
    </ul>
  )
}
