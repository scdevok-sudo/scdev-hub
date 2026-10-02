import { inputClass } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

export interface Period {
  mode: 'historico' | 'mes'
  mes: string // YYYY-MM
}

export function currentMes(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** `undefined` = historico: el backend no filtra por fecha. */
export function periodToMes(period: Period): string | undefined {
  return period.mode === 'mes' ? period.mes : undefined
}

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (next: Period) => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-line bg-graphite p-0.5">
        {(['historico', 'mes'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ ...value, mode, mes: value.mes || currentMes() })}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              value.mode === mode ? 'bg-red text-white' : 'text-txt2 hover:text-txt',
            )}
          >
            {mode === 'historico' ? 'Histórico' : 'Mes'}
          </button>
        ))}
      </div>
      {value.mode === 'mes' && (
        <input
          type="month"
          aria-label="Mes del resumen"
          className={cn(inputClass, 'w-auto py-1 text-xs')}
          value={value.mes}
          max="2100-12"
          onChange={(e) => e.target.value && onChange({ ...value, mes: e.target.value })}
        />
      )}
    </div>
  )
}
