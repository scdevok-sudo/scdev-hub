import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { ClientForm } from '@/components/forms/ClientForm'
import { ClientServiceForm } from '@/components/forms/ClientServiceForm'
import {
  deleteClient,
  deleteClientService,
  useClientServices,
  useClients,
} from '@/hooks/useFinance'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import type { Client, ClientService, EstadoPago } from '@/types'

const ESTADO_DOT: Record<EstadoPago, string> = {
  al_dia: 'bg-emerald-400',
  pendiente: 'bg-amber-400',
  atrasado: 'bg-red',
}

const ESTADO_LABEL: Record<EstadoPago, string> = {
  al_dia: 'Al dia',
  pendiente: 'Pendiente',
  atrasado: 'Atrasado',
}

export function ClientsGrid() {
  const { data: clients, loading, error, reload } = useClients()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)

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
          Nuevo cliente
        </Button>
      </div>

      {clients?.length === 0 ? (
        <EmptyState title="Sin clientes" description="Cargá el primer cliente para empezar a facturar." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients?.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={() => {
                setEditing(client)
                setFormOpen(true)
              }}
              onDeleted={reload}
            />
          ))}
        </div>
      )}

      <ClientForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} client={editing} />
    </div>
  )
}

function ClientCard({
  client,
  onEdit,
  onDeleted,
}: {
  client: Client
  onEdit: () => void
  onDeleted: () => void
}) {
  const { data: services, reload: reloadServices } = useClientServices(client.id)
  const [serviceFormOpen, setServiceFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<ClientService | null>(null)

  return (
    <article className="rounded-xl border border-line bg-graphite p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-txt">{client.name}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-txt2">
            <span className={cn('size-1.5 rounded-full', ESTADO_DOT[client.estado_pago])} />
            {ESTADO_LABEL[client.estado_pago]}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} aria-label="Editar cliente" className="text-txt3 hover:text-txt">
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={async () => {
              await deleteClient(client.id)
              onDeleted()
            }}
            aria-label="Borrar cliente"
            className="text-txt3 hover:text-red"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {client.rubro && <p className="mt-2 text-xs text-txt3">{client.rubro}</p>}

      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-txt3">Servicios activos</p>
          <button
            onClick={() => {
              setEditingService(null)
              setServiceFormOpen(true)
            }}
            className="text-[11px] font-medium text-red hover:underline"
          >
            + Servicio
          </button>
        </div>
        {!services || services.length === 0 ? (
          <p className="text-xs text-txt3">Sin servicios cargados</p>
        ) : (
          services.map((service) => (
            <div key={service.id} className="flex items-center justify-between gap-2 text-xs">
              <button
                onClick={() => {
                  setEditingService(service)
                  setServiceFormOpen(true)
                }}
                className="min-w-0 flex-1 truncate text-left text-txt2 hover:text-txt"
              >
                {service.servicio}
                {service.proxima_fecha_vencimiento && (
                  <span className="text-txt3"> · vence {formatDate(service.proxima_fecha_vencimiento)}</span>
                )}
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {service.monto_mensual != null && (
                  <span className="text-txt2">{formatMoney(service.monto_mensual)}</span>
                )}
                <button
                  onClick={async () => {
                    await deleteClientService(service.id)
                    reloadServices()
                  }}
                  aria-label="Borrar servicio"
                  className="text-txt3 hover:text-red"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ClientServiceForm
        open={serviceFormOpen}
        onClose={() => setServiceFormOpen(false)}
        onSaved={reloadServices}
        clientId={client.id}
        service={editingService}
      />
    </article>
  )
}
