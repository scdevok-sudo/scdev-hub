import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { useClientServicesPipeline, useInvoicesPipeline } from '@/hooks/useFinance'
import { formatDate, formatMoney } from '@/lib/utils'

type Item = { id: string; fecha: string; label: string; detail: string; kind: 'cobro' | 'servicio' }

export function UpcomingList() {
  const { data: invoicesPipeline, loading: loadingInvoices, error: errorInvoices } = useInvoicesPipeline()
  const { data: servicesPipeline, loading: loadingServices, error: errorServices } = useClientServicesPipeline(30)

  if (loadingInvoices || loadingServices) return <Loading />
  if (errorInvoices) return <ErrorState message={errorInvoices} />
  if (errorServices) return <ErrorState message={errorServices} />

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
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (items.length === 0) {
    return <EmptyState title="Sin vencimientos proximos" description="No hay cobros ni servicios por vencer." />
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
              item.kind === 'cobro' ? 'text-xs font-medium text-red' : 'text-xs font-medium text-sky-400'
            }
          >
            {item.detail}
          </span>
        </li>
      ))}
    </ul>
  )
}
