import { Pencil, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate, formatHours } from '@/lib/utils'
import type { TimeLog } from '@/types'

interface TimeLogTableProps {
  logs: TimeLog[]
  showUser?: boolean
  showProject?: boolean
  onEdit?: (log: TimeLog) => void
  onDelete?: (log: TimeLog) => void
}

export function TimeLogTable({
  logs,
  showUser = false,
  showProject = false,
  onEdit,
  onDelete,
}: TimeLogTableProps) {
  const total = logs.reduce((sum, log) => sum + Number(log.hours), 0)
  const actions = Boolean(onEdit || onDelete)

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-graphite">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-txt3">
            <th className="px-4 py-3 font-medium">Fecha</th>
            {showUser && <th className="px-4 py-3 font-medium">Persona</th>}
            {showProject && <th className="px-4 py-3 font-medium">Proyecto</th>}
            <th className="px-4 py-3 font-medium">Descripcion</th>
            <th className="px-4 py-3 text-right font-medium">Horas</th>
            {actions && <th className="w-20 px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-line/60 last:border-0">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-txt2">
                {formatDate(log.logged_date)}
              </td>

              {showUser && (
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-xs text-txt">
                    <Avatar user={log.user} size="xs" />
                    {log.user?.name ?? '-'}
                  </span>
                </td>
              )}

              {showProject && (
                <td className="px-4 py-3 text-xs text-txt2">{log.project_name ?? '-'}</td>
              )}

              <td className="px-4 py-3">
                <p className="text-xs text-txt">{log.description}</p>
                {log.task_title && (
                  <p className="mt-0.5 text-[11px] text-txt3">Tarea: {log.task_title}</p>
                )}
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-txt">
                {formatHours(log.hours)}
              </td>

              {actions && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {onEdit && log.editable && (
                      <button
                        onClick={() => onEdit(log)}
                        aria-label="Editar registro"
                        className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-graphite2 hover:text-txt"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                    {onDelete && log.editable && (
                      <button
                        onClick={() => onDelete(log)}
                        aria-label="Borrar registro"
                        className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-red-dim hover:text-red"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line bg-graphite2/40">
            <td
              className="px-4 py-3 text-xs font-medium text-txt2"
              colSpan={1 + (showUser ? 1 : 0) + (showProject ? 1 : 0) + 1}
            >
              Total
            </td>
            <td className="px-4 py-3 text-right text-xs font-semibold text-txt">
              {formatHours(total)}
            </td>
            {actions && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
