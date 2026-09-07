import type { LucideIcon } from 'lucide-react'
import { Clock, FolderKanban, ListTodo, Wallet } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { TimeLogTable } from '@/components/TimeLogTable'
import { useDashboard } from '@/hooks/useDashboard'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatHours, formatMoney } from '@/lib/utils'

export default function Dashboard() {
  const { user } = useCurrentUser()
  const { data, loading, error } = useDashboard()

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <PageWrapper
      crumbs={[{ label: 'Dashboard' }]}
      title={`Hola, ${firstName}`}
      subtitle="Tu resumen del mes"
    >
      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Widget
              icon={Clock}
              label="Horas del mes"
              value={formatHours(data.hours_this_month)}
            />
            <Widget
              icon={Wallet}
              label="Estimado a cobrar"
              value={formatMoney(data.estimated_payout)}
              accent
            />
            <Widget
              icon={FolderKanban}
              label="Proyectos activos"
              value={String(data.active_projects)}
            />
            <Widget
              icon={ListTodo}
              label="Tareas pendientes"
              value={String(data.pending_tasks)}
            />
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-txt3">
              Ultimos 7 dias
            </h2>
            {data.recent_logs.length === 0 ? (
              <EmptyState
                title="Sin actividad reciente"
                description="No cargaste horas en los ultimos 7 dias."
              />
            ) : (
              <TimeLogTable logs={data.recent_logs} showProject />
            )}
          </section>
        </>
      )}
    </PageWrapper>
  )
}

function Widget({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <article className="rounded-xl border border-line bg-graphite p-5">
      <div className="flex items-center gap-2 text-txt3">
        <Icon className="size-4" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={accent ? 'mt-2 font-display text-2xl text-red' : 'mt-2 font-display text-2xl text-txt'}>
        {value}
      </p>
    </article>
  )
}
