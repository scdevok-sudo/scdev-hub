import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Inbox, Pencil, Plus, X } from 'lucide-react'
import { CalendarConnectCard } from '@/components/CalendarConnectCard'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, PriorityBadge, ProjectStatusBadge } from '@/components/ui/Badge'
import { inputClass } from '@/components/ui/Field'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { useProjects } from '@/hooks/useProjects'
import { usePendingClaims } from '@/hooks/useTasks'
import { useUsersWithHours } from '@/hooks/useUsers'
import { ApiError, api } from '@/lib/api'
import { cn, formatHours, formatMoney, formatPct } from '@/lib/utils'
import type { PendingClaim, Project, ProjectInput, User } from '@/types'

export default function Admin() {
  const { data: projects, loading, error, reload, setData } = useProjects()
  const { data: users, loading: loadingUsers } = useUsersWithHours()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  // Los toggles de miembros mutan un solo proyecto: se aplica en memoria para que
  // el switch responda al instante sin recargar toda la grilla.
  const patchProject = (id: string, patch: Partial<Project>) => {
    setData((projects ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

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
      <CalendarConnectCard />

      <PendingClaimsSection />

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
        {projects?.length === 0 && (
          <EmptyState
            title="Todavia no hay proyectos"
            description="Crea el primero con el boton de arriba."
          />
        )}

        {projects && projects.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectAdminCard
                key={project.id}
                project={project}
                users={users ?? []}
                onEdit={() => {
                  setEditing(project)
                  setFormOpen(true)
                }}
                onPatch={(patch) => patchProject(project.id, patch)}
                onSaved={reload}
              />
            ))}
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

interface ProjectAdminCardProps {
  project: Project
  users: User[]
  onEdit: () => void
  onPatch: (patch: Partial<Project>) => void
  onSaved: () => void
}

function ProjectAdminCard({ project, users, onEdit, onPatch, onSaved }: ProjectAdminCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-line bg-graphite">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <Link
            to={`/proyectos/${project.id}`}
            className="block truncate text-sm font-medium text-txt transition-colors hover:text-red"
          >
            {project.name}
          </Link>
          <p className="truncate text-[11px] text-txt3">{project.client_name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ProjectStatusBadge status={project.status} />
          <button
            onClick={onEdit}
            aria-label={`Editar ${project.name}`}
            className="rounded-md p-1.5 text-txt3 transition-colors hover:bg-graphite2 hover:text-txt"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 text-xs">
        <Metric label="Horas" value={formatHours(project.logged_hours)} />
        <Metric label="Estructura" value={formatPct(project.structure_pct)} />
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-txt3">Facturado</span>
          <BilledCell project={project} onSaved={onSaved} />
        </div>
      </div>

      <MembersSection project={project} users={users} onPatch={onPatch} />
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] text-txt3">{label}</span>
      <span className="text-txt">{value}</span>
    </div>
  )
}

interface MembersSectionProps {
  project: Project
  users: User[]
  onPatch: (patch: Partial<Project>) => void
}

function MembersSection({ project, users, onPatch }: MembersSectionProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const memberIds = project.member_ids ?? []

  const toggle = async (user: User) => {
    const isMember = memberIds.includes(user.id)
    const next = isMember ? memberIds.filter((id) => id !== user.id) : [...memberIds, user.id]

    setBusy(user.id)
    setError(null)
    onPatch({ member_ids: next })
    try {
      if (isMember) await api.delete(`/projects/${project.id}/members/${user.id}`)
      else await api.post(`/projects/${project.id}/members`, { user_id: user.id })
    } catch {
      onPatch({ member_ids: memberIds })
      setError(`No se pudo actualizar a ${user.name}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="px-4 py-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-txt3">Miembros</h3>

      {error && <p className="mb-2 text-[11px] text-red">{error}</p>}

      <ul className="space-y-1">
        {users.map((user) => {
          const isAdmin = user.role === 'admin'
          const isMember = memberIds.includes(user.id)
          return (
            <li key={user.id} className="flex items-center gap-2.5 py-0.5">
              <Avatar user={user} size="xs" />
              <span className="min-w-0 flex-1 truncate text-xs text-txt2">{user.name}</span>
              {isAdmin ? (
                // El admin ve todos los proyectos por rol: la membresia no le cambia nada.
                <span className="text-[10px] text-txt3">ve todo</span>
              ) : (
                <MemberToggle
                  active={isMember}
                  disabled={busy === user.id}
                  label={`${isMember ? 'Quitar a' : 'Agregar a'} ${user.name} en ${project.name}`}
                  onClick={() => void toggle(user)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface MemberToggleProps {
  active: boolean
  disabled: boolean
  label: string
  onClick: () => void
}

function MemberToggle({ active, disabled, label, onClick }: MemberToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-red bg-red' : 'border-line bg-graphite2 hover:border-txt3',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-transform',
          active ? 'translate-x-[18px] bg-white' : 'translate-x-[3px] bg-txt3',
        )}
      />
    </button>
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
    <div className="flex items-center gap-1">
      <input
        className={`${inputClass} h-7 w-24 px-2 py-0.5 text-right text-xs`}
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
        className="rounded-md p-1 text-emerald-400 transition-colors hover:bg-graphite2"
      >
        <Check className="size-3.5" />
      </button>
      <button
        onClick={() => setEditing(false)}
        aria-label="Cancelar"
        className="rounded-md p-1 text-txt3 transition-colors hover:bg-graphite2"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function PendingClaimsSection() {
  const { data: claims, loading, error, resolve } = usePendingClaims()
  const [busy, setBusy] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const act = async (claim: PendingClaim, action: 'approve' | 'reject') => {
    setBusy(claim.task.id)
    setFailure(null)
    try {
      await resolve(claim.task.id, action)
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : 'No se pudo resolver la solicitud')
    } finally {
      setBusy(null)
    }
  }

  // Sin solicitudes la seccion no aporta nada: se esconde en vez de mostrar un vacio.
  if (loading || (claims && claims.length === 0)) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-txt3">
        <Inbox className="size-4" />
        Solicitudes pendientes
        {claims && claims.length > 0 && (
          <span className="rounded-full bg-orange-500/15 px-2 text-[11px] leading-5 text-orange-400">
            {claims.length}
          </span>
        )}
      </h2>

      {error && <ErrorState message={error} />}
      {failure && (
        <div className="mb-3">
          <ErrorState message={failure} />
        </div>
      )}

      <ul className="space-y-2">
        {claims?.map((claim) => (
          <li
            key={claim.task.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-500/25 bg-graphite p-3"
          >
            <Avatar user={claim.claimer} size="sm" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-txt">{claim.task.title}</p>
              <p className="truncate text-[11px] text-txt3">
                <span className="text-txt2">{claim.claimer?.name ?? 'Alguien'}</span>
                {claim.project_name ? ` · ${claim.project_name}` : ''}
              </p>
            </div>

            <PriorityBadge priority={claim.task.priority} />

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={busy === claim.task.id}
                onClick={() => void act(claim, 'approve')}
              >
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === claim.task.id}
                onClick={() => void act(claim, 'reject')}
              >
                Rechazar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
