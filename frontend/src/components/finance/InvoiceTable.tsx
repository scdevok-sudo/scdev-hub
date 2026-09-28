import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Field, inputClass } from '@/components/ui/Field'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { deleteInvoice, updateInvoice, useInvoices } from '@/hooks/useFinance'
import { formatDate, formatMoney } from '@/lib/utils'
import type { Client, Invoice } from '@/types'

const ESTADO_LABEL: Record<Invoice['estado'], string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  cobrado: 'Cobrado',
}

const ESTADO_CLASS: Record<Invoice['estado'], string> = {
  pendiente: 'bg-amber-500/12 text-amber-400',
  parcial: 'bg-sky-500/12 text-sky-400',
  cobrado: 'bg-emerald-500/12 text-emerald-400',
}

export function InvoiceTable({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState('')
  const [estado, setEstado] = useState('')
  const [mes, setMes] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)

  const { data: invoices, loading, error, reload } = useInvoices({ clientId, estado, mes })

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Field label="Cliente" className="w-44">
            <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado" className="w-36">
            <select className={inputClass} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="cobrado">Cobrado</option>
            </select>
          </Field>
          <Field label="Mes" className="w-36">
            <input
              type="month"
              className={inputClass}
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </Field>
        </div>
        <Button
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Nueva factura
        </Button>
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      {!loading && !error && invoices?.length === 0 && (
        <EmptyState title="Sin facturas" description="Todavia no hay facturas para este filtro." />
      )}

      {!loading && invoices && invoices.length > 0 && (
        <>
          {/* Mobile: card por factura. */}
          <div className="space-y-2 md:hidden">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-line bg-graphite p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-txt">{invoice.client_name}</p>
                    <p className="text-xs text-txt3">
                      {formatDate(invoice.fecha)} · {invoice.servicio ?? '-'}
                    </p>
                  </div>
                  <Badge className={ESTADO_CLASS[invoice.estado]}>{ESTADO_LABEL[invoice.estado]}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-txt2">Monto {formatMoney(invoice.monto)}</span>
                  <span className="text-txt">Saldo {formatMoney(invoice.saldo_pendiente)}</span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1 border-t border-line pt-2">
                  {invoice.estado !== 'cobrado' && (
                    <button
                      onClick={async () => {
                        await updateInvoice(invoice.id, { estado: 'cobrado', saldo_pendiente: 0 })
                        reload()
                      }}
                      className="mr-auto text-xs font-medium text-emerald-400 hover:underline"
                    >
                      Marcar cobrado
                    </button>
                  )}
                  <button
                    aria-label="Editar factura"
                    onClick={() => {
                      setEditing(invoice)
                      setFormOpen(true)
                    }}
                    className="rounded-md p-2 text-txt3 transition-colors hover:bg-graphite2 hover:text-txt"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    aria-label="Borrar factura"
                    onClick={async () => {
                      await deleteInvoice(invoice.id)
                      reload()
                    }}
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
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Servicio</th>
                  <th className="px-4 py-2.5">Monto</th>
                  <th className="px-4 py-2.5">Saldo</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="w-20 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-2.5 text-txt2">{formatDate(invoice.fecha)}</td>
                    <td className="px-4 py-2.5 text-txt">{invoice.client_name}</td>
                    <td className="px-4 py-2.5 text-txt2">{invoice.servicio ?? '-'}</td>
                    <td className="px-4 py-2.5 text-txt">{formatMoney(invoice.monto)}</td>
                    <td className="px-4 py-2.5 text-txt2">{formatMoney(invoice.saldo_pendiente)}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={ESTADO_CLASS[invoice.estado]}>{ESTADO_LABEL[invoice.estado]}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.estado !== 'cobrado' && (
                          <button
                            onClick={async () => {
                              await updateInvoice(invoice.id, { estado: 'cobrado', saldo_pendiente: 0 })
                              reload()
                            }}
                            className="text-[11px] font-medium text-emerald-400 hover:underline"
                          >
                            Marcar cobrado
                          </button>
                        )}
                        <button
                          aria-label="Editar factura"
                          onClick={() => {
                            setEditing(invoice)
                            setFormOpen(true)
                          }}
                          className="text-txt3 transition-colors hover:text-txt"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          aria-label="Borrar factura"
                          onClick={async () => {
                            await deleteInvoice(invoice.id)
                            reload()
                          }}
                          className="text-txt3 transition-colors hover:text-red"
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

      <InvoiceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        clients={clients}
        invoice={editing}
      />
    </div>
  )
}
