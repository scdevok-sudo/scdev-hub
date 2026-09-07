import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, ProjectStatusBadge } from '@/components/ui/Badge'
import { inputClass } from '@/components/ui/Field'
import { ErrorState, Loading } from '@/components/ui/States'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { useProjects } from '@/hooks/useProjects'
import { useUsersWithHours } from '@/hooks/useUsers'
import { api } from '@/lib/api'
import { formatHours, formatMoney, formatPct } from '@/lib/utils'
import type { Project, ProjectInput } from '@/types'

export default function Admin() {
  const { data: projects, loading, error, reload } = useProjects()
  const { data: users, loading: loadingUsers } = useUsersWithHours()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  return (
    <PageWrapper
      crumbs={[{ label: 'Admin' }]}
      title="Administracion"
      subtitle="Equipo, proyectos y facturacion"
      actions={
        <Button
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Nuevo proyecto
        </Button>
      }
    >
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-txt3">
          Equipo · horas del mes
        </h2>
        {loadingUsers ? (
          <Loading />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {users?.map((user) => (
              <article
                key={user.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-graphite p-4"
              >
                <Avatar user={user} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-txt">{user.name}</p>
                  <p className="truncate text-[11px] text-txt3">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-base text-txt">
                    {formatHours(user.hours_this_month)}
                  </p>
                  {user.role === 'admin' && <Badge className="mt-0.5">admin</Badge>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-txt3">Proyectos</h2>

        {loading && <Loading />}
        {error && <ErrorState message={error} />}

        {projects && projects.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-line bg-graphite">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-txt3">
                  <th className="px-4 py-3 font-medium">Proyecto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Horas</th>
                  <th className="px-4 py-3 text-right font-medium">Estructura</th>
                  <th className="px-4 py-3 text-right font-medium">Facturado</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/proyectos/${project.id}`}
                        className="text-xs font-medium text-txt hover:text-red"
                      >
                        {project.name}
                      </Link>
                      <p className="text-[11px] text-txt3">{project.client_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-txt2">
                      {formatHours(project.logged_hours)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-txt2">
                      {formatPct(project.structure_pct)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BilledCell project={project} onSaved={reload} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setEditing(project)
                          setFormOpen(true)
                        }}
                        aria-label={`Editar ${project.name}`}
                        className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-graphite2 hover:text-txt"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ProjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={editing}
        onSubmit={async (input: ProjectInput) => {
          if (editing) await api.patch(`/projects/${editing.id}`, input)
          else await api.post('/projects', input)
          reload()
        }}
      />
    </PageWrapper>
  )
}

function BilledCell({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(Number(project.billed_amount ?? 0)))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await api.patch(`/projects/${project.id}`, { billed_amount: Number(value) })
      onSaved()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-txt transition-colors hover:text-red"
        title="Editar monto facturado"
      >
        {formatMoney(project.billed_amount)}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        className={`${inputClass} h-8 w-28 py-1 text-right text-xs`}
        type="number"
        min={0}
        step={1000}
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      <button
        onClick={() => void save()}
        disabled={saving}
        aria-label="Guardar"
        className="rounded-md p-1.5 text-emerald-400 transition-colors hover:bg-graphite2"
      >
        <Check className="size-3.5" />
      </button>
      <button
        onClick={() => setEditing(false)}
        aria-label="Cancelar"
        className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-graphite2"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
