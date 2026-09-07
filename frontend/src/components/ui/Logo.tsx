import { cn } from '@/lib/utils'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display select-none', className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-red text-sm font-bold text-white">
        SC
      </span>
      {!compact && (
        <span className="text-lg leading-none tracking-tight text-txt">
          SCdev <span className="text-red">Hub</span>
        </span>
      )}
    </span>
  )
}
