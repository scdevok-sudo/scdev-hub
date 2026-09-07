import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { formatHours, formatMoney, formatPct } from '@/lib/utils'
import type { ProjectSummary } from '@/types'

interface PayoutSummaryProps {
  summary: ProjectSummary | null
  loading: boolean
  error: string | null
}

export function PayoutSummary({ summary, loading, error }: PayoutSummaryProps) {
  if (loading) return <Loading label="Calculando reparto..." />
  if (error) return <ErrorState message={error} />
  if (!summary) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Facturado" value={formatMoney(summary.billed_amount)} />
        <Stat
          label={`Estructura SCdev (${formatPct(summary.structure_pct)})`}
          value={formatMoney(summary.structure_amount)}
          muted
        />
        <Stat label="A repartir" value={formatMoney(summary.distributable)} accent />
      </div>

      {summary.rows.length === 0 ? (
        <EmptyState
          title="Todavia no hay horas cargadas"
          description="El reparto se calcula sobre las horas de cada persona en el proyecto."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.rows.map((row) => (
              <article
                key={row.user.id}
                className="rounded-xl border border-line bg-graphite p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar user={row.user} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-txt">{row.user.name}</p>
                    <p className="text-[11px] text-txt2">
                      {formatHours(row.hours)} · {formatPct(row.share_pct)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-graphite2">
                  <div
                    className="h-full rounded-full bg-red"
                    style={{ width: `${Math.max(2, row.share_pct * 100)}%` }}
                  />
                </div>

                <p className="mt-3 text-right font-display text-xl text-txt">
                  {formatMoney(row.payout)}
                </p>
              </article>
            ))}
          </div>

          <p className="text-right text-[11px] text-txt3">
            Total {formatHours(summary.total_hours)} · reparto sobre{' '}
            {formatMoney(summary.distributable)}
          </p>
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false,
  muted = false,
}: {
  label: string
  value: string
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div className="rounded-xl border border-line bg-graphite p-4">
      <p className="text-[11px] uppercase tracking-wide text-txt3">{label}</p>
      <p
        className={
          accent
            ? 'mt-1 font-display text-xl text-red'
            : muted
              ? 'mt-1 font-display text-xl text-txt2'
              : 'mt-1 font-display text-xl text-txt'
        }
      >
        {value}
      </p>
    </div>
  )
}
