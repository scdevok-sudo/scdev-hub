import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-txt2">
        {label}
        {required && <span className="text-red">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-txt3">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-red">{error}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-graphite2 px-3 py-2 text-sm text-txt ' +
  'placeholder:text-txt3 transition-colors focus:border-red focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50'
