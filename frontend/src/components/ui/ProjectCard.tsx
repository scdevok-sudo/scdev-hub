import { Link } from 'react-router-dom'
import { Clock, ListTodo } from 'lucide-react'
import { ProjectStatusBadge } from '@/components/ui/Badge'
import { formatHours } from '@/lib/utils'
import type { Project } from '@/types'

export function ProjectCard({ project }: { project: Project }) {
  const estimated = Number(project.estimated_hours ?? 0)
  const logged = Number(project.logged_hours ?? 0)
  const ratio = estimated > 0 ? Math.min(1, logged / estimated) : 0
  const over = estimated > 0 && logged > estimated

  return (
    <Link
      to={`/proyectos/${project.id}`}
      className="group flex flex-col rounded-xl border border-line bg-graphite p-5 transition-colors hover:border-txt3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-txt group-hover:text-white">
            {project.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-txt2">{project.client_name}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-txt3">{project.description}</p>
      )}

      {estimated > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-txt2">{formatHours(logged)} de {formatHours(estimated)}</span>
            <span className={over ? 'text-red' : 'text-txt3'}>
              {Math.round((logged / estimated) * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-graphite2">
            <div
              className={over ? 'h-full rounded-full bg-red' : 'h-full rounded-full bg-emerald-500'}
              style={{ width: `${Math.max(2, ratio * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-[11px] text-txt3">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {formatHours(logged)}
        </span>
        <span className="flex items-center gap-1.5">
          <ListTodo className="size-3.5" />
          {project.open_tasks} pendientes
        </span>
      </div>
    </Link>
  )
}
