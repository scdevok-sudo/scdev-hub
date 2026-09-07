import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { ProjectStatusBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { PayoutSummary } from '@/components/PayoutSummary'
import { TimeLogTable } from '@/components/TimeLogTable'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { TimeLogForm } from '@/components/forms/TimeLogForm'
import { useProject, useProjectSummary } from '@/hooks/useProjects'
import { useProjectTimeLogs, deleteTimeLog } from '@/hooks/useTimeLogs'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { api } from '@/lib/api'
import { cn, formatHours } from '@/lib/utils'
import type { ProjectInput, TimeLog } from '@/types'

type Tab = 'kanban' | 'horas' | 'reparto'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { isAdmin } = useCurrentUser()
  const { data: project, loading, error, reload } = useProject(id)
  const [tab, setTab] = useState<Tab>('kanban')
  const [editOpen, setEditOpen] = useState(false)

  const billed = Number(project?.billed_amount ?? 0)
  const showPayout = billed > 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'kanban', label: 'Kanban' },
    { key: 'horas', label: 'Horas' },
    ...(showPayout ? [{ key: 'reparto' as Tab, label: 'Reparto' }] : []),
  ]

  if (loading) {
    return (
      <PageWrapper crumbs={[{ label: 'Proyectos', to: '/proyectos' }, { label: '...' }]}>
        <Loading />
      </PageWrapper>
    )
  }

  if (error || !project) {
    return (
      <PageWrapper crumbs={[{ label: 'Proyectos', to: '/proyectos' }, { label: 'Error' }]}>
        <ErrorState message={error ?? 'Proyecto no encontrado'} />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      crumbs={[{ label: 'Proyectos', to: '/proyectos' }, { label: project.name }]}
      actions={
        isAdmin && (
          <Button
            size="sm"
            variant="outline"
            icon={<Pencil className="size-3.5" />}
            onClick={() => setEditOpen(true)}
          >
            Editar
          </Button>
        )
      }
    >
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-normal text-txt">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="mt-1 text-sm text-txt2">
          {project.client_name} · {formatHours(project.logged_hours)} cargadas
          {project.estimated_hours ? ` de ${formatHours(project.estimated_hours)}` : ''}
        </p>
        {project.description && (
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-txt3">{project.description}</p>
        )}
      </div>

      <div className="mb-5 flex gap-1 border-b border-line">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === item.key
                ? 'border-red text-txt'
                : 'border-transparent text-txt2 hover:text-txt',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'kanban' && <KanbanBoard projectId={project.id} />}
      {tab === 'horas' && <ProjectHoursTab projectId={project.id} onChanged={reload} />}
      {tab === 'reparto' && showPayout && <ProjectPayoutTab projectId={project.id} />}

      <ProjectForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        onSubmit={async (input: ProjectInput) => {
          await api.patch(`/projects/${project.id}`, input)
          reload()
        }}
      />
    </PageWrapper>
  )
}

function ProjectHoursTab({ projectId, onChanged }: { projectId: string; onChanged: () => void }) {
  const { data: logs, loading, error, reload } = useProjectTimeLogs(projectId)
  const { data: project } = useProject(projectId)
  const { isAdmin } = useCurrentUser()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TimeLog | null>(null)

  const refresh = () => {
    reload()
    onChanged()
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
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
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      {!loading && !error && logs?.length === 0 && (
        <EmptyState
          title="Sin horas cargadas"
          description={
            isAdmin
              ? 'Nadie cargo horas en este proyecto todavia.'
              : 'Todavia no cargaste horas en este proyecto.'
          }
        />
      )}

      {!loading && logs && logs.length > 0 && (
        <TimeLogTable
          logs={logs}
          showUser={isAdmin}
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

      <TimeLogForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        projects={project ? [project] : []}
        lockedProjectId={projectId}
        log={editing}
      />
    </>
  )
}

function ProjectPayoutTab({ projectId }: { projectId: string }) {
  const { data: summary, loading, error } = useProjectSummary(projectId)
  return <PayoutSummary summary={summary} loading={loading} error={error} />
}
