import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { TimeLogTable } from '@/components/TimeLogTable'
import { TimeLogForm } from '@/components/forms/TimeLogForm'
import { useMyTimeLogs, deleteTimeLog } from '@/hooks/useTimeLogs'
import { useProjects } from '@/hooks/useProjects'
import { useDashboard } from '@/hooks/useDashboard'
import { MONTHS, formatHours, formatMoney } from '@/lib/utils'
import type { TimeLog } from '@/types'

export default function MyHours() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TimeLog | null>(null)

  const { data: logs, loading, error, reload } = useMyTimeLogs(month, year)
  const { data: projects } = useProjects()
  const { data: dashboard, reload: reloadDashboard } = useDashboard()

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  const total = useMemo(
    () => (logs ?? []).reduce((sum, log) => sum + Number(log.hours), 0),
    [logs],
  )

  const shift = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1)
    setMonth(date.getMonth() + 1)
    setYear(date.getFullYear())
  }

  const refresh = () => {
    reload()
    reloadDashboard()
  }

  return (
    <PageWrapper
      crumbs={[{ label: 'Mis horas' }]}
      title="Mis horas"
      subtitle="Todo lo que cargaste, mes a mes"
      actions={
        <Button
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Cargar horas
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-graphite p-1">
          <button
            onClick={() => shift(-1)}
            aria-label="Mes anterior"
            className="rounded-md p-1.5 text-txt2 transition-colors hover:bg-graphite2 hover:text-txt"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-40 text-center text-sm font-medium text-txt">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => shift(1)}
            aria-label="Mes siguiente"
            disabled={isCurrentMonth}
            className="rounded-md p-1.5 text-txt2 transition-colors hover:bg-graphite2 hover:text-txt disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <div className="rounded-lg border border-line bg-graphite px-4 py-2">
            <p className="text-[11px] uppercase tracking-wide text-txt3">Horas del mes</p>
            <p className="font-display text-lg text-txt">{formatHours(total)}</p>
          </div>
          {isCurrentMonth && (
            <div className="rounded-lg border border-line bg-graphite px-4 py-2">
              <p className="text-[11px] uppercase tracking-wide text-txt3">Estimado a cobrar</p>
              <p className="font-display text-lg text-red">
                {formatMoney(dashboard?.estimated_payout ?? 0)}
              </p>
            </div>
          )}
        </div>
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      {!loading && !error && logs?.length === 0 && (
        <EmptyState
          title={`Sin horas en ${MONTHS[month - 1]}`}
          description="Carga tus horas para que entren en el reparto del proyecto."
          action={
            <Button size="sm" onClick={() => setFormOpen(true)}>
              Cargar horas
            </Button>
          }
        />
      )}

      {!loading && logs && logs.length > 0 && (
        <TimeLogTable
          logs={logs}
          showProject
          onEdit={(log) => {
            setEditing(log)
            setFormOpen(true)
          }}
          onDelete={async (log) => {
            await deleteTimeLog(log.id)
            refresh()
          }}
        />
      )}

      <p className="mt-3 text-[11px] text-txt3">
        Los registros solo se pueden editar o borrar el mismo dia que se cargaron. Despues, pedile a
        un admin.
      </p>

      <TimeLogForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        projects={projects ?? []}
        log={editing}
      />
    </PageWrapper>
  )
}
