import { cn } from '@/lib/utils'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-display select-none', className)}>
      <img
        src="/favicon.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0"
      />
      {!compact && (
        <span className="text-lg leading-none tracking-tight text-txt">
          SCdev <span className="text-red">Hub</span>
        </span>
      )}
    </span>
  )
}
