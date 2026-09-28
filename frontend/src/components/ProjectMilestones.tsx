import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { AgendarButton } from '@/components/forms/AgendarButton'
import { MilestoneForm } from '@/components/forms/MilestoneForm'
import { deleteMilestone, useMilestones } from '@/hooks/useMilestones'
import { formatDate } from '@/lib/utils'
import type { Milestone } from '@/types'

export function ProjectMilestones({ projectId }: { projectId: string }) {
  const { data: milestones, loading, error, reload } = useMilestones(projectId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)

  if (loading) return <Loading />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Nuevo hito
        </Button>
      </div>

      {milestones?.length === 0 ? (
        <EmptyState title="Sin hitos" description="Marca las fechas clave de este proyecto." />
      ) : (
        <ul className="space-y-2">
          {milestones?.map((milestone) => (
            <li
              key={milestone.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-graphite p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-txt">{milestone.title}</p>
                {milestone.due_date && (
                  <p className="text-[11px] text-txt3">
                    {formatDate(milestone.due_date)}
                    {milestone.google_event_id && (
                      <span className="ml-1.5 text-emerald-400">· en Calendar</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {milestone.calendar_sync === 'manual' && !milestone.google_event_id && milestone.due_date && (
                  <AgendarButton path={`/milestones/${milestone.id}/agendar`} onDone={reload} />
                )}
                <button
                  aria-label="Editar hito"
                  onClick={() => {
                    setEditing(milestone)
                    setFormOpen(true)
                  }}
                  className="rounded-md p-1.5 text-txt3 hover:bg-graphite2 hover:text-txt"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  aria-label="Borrar hito"
                  onClick={async () => {
                    await deleteMilestone(milestone.id)
                    reload()
                  }}
                  className="rounded-md p-1.5 text-txt3 hover:bg-red-dim hover:text-red"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MilestoneForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        projectId={projectId}
        milestone={editing}
      />
    </div>
  )
}
