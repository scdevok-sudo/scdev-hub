import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { EmptyState, ErrorState, Loading } from '@/components/ui/States'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { useProjects } from '@/hooks/useProjects'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { api } from '@/lib/api'
import type { Project, ProjectInput } from '@/types'

export default function Projects() {
  const { isAdmin } = useCurrentUser()
  const { data: projects, loading, error, reload } = useProjects()
  const [formOpen, setFormOpen] = useState(false)

  return (
    <PageWrapper
      crumbs={[{ label: 'Proyectos' }]}
      title="Proyectos"
      subtitle={isAdmin ? 'Todos los proyectos del equipo' : 'Proyectos activos donde participas'}
      actions={
        isAdmin && (
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
            Nuevo proyecto
          </Button>
        )
      }
    >
      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      {!loading && !error && projects?.length === 0 && (
        <EmptyState
          title="No hay proyectos todavia"
          description={
            isAdmin
              ? 'Crea el primero para empezar a cargar horas y tareas.'
              : 'Vas a ver un proyecto aca cuando tengas horas o tareas asignadas en el.'
          }
          action={
            isAdmin && (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                Nuevo proyecto
              </Button>
            )
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects?.map((project: Project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <ProjectForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={async (input: ProjectInput) => {
          await api.post('/projects', input)
          reload()
        }}
      />
    </PageWrapper>
  )
}
