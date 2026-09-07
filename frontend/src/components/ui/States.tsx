import type { ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

export function Loading({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-txt2">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red/30 bg-red-dim px-4 py-3 text-sm text-red">
      <AlertCircle className="size-4 shrink-0" />
      {message}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="text-sm font-medium text-txt">{title}</p>
      {description && <p className="max-w-sm text-xs text-txt2">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
