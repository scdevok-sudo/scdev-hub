import { PageWrapper } from '@/components/layout/PageWrapper'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'

export default function AdminTasks() {
  return (
    <PageWrapper
      crumbs={[{ label: 'Pendientes' }]}
      title="Pendientes"
      subtitle="Tu tablero personal, fuera de cualquier proyecto"
    >
      <KanbanBoard variant="admin" />
    </PageWrapper>
  )
}
