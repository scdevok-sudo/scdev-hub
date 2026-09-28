import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from '@/components/ui/Field'
import { CalendarSyncField } from '@/components/forms/CalendarSyncField'
import { ApiError } from '@/lib/api'
import { createMilestone, updateMilestone } from '@/hooks/useMilestones'
import type { CalendarSync, Milestone } from '@/types'

interface MilestoneFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projectId: string
  milestone?: Milestone | null
}

export function MilestoneForm({ open, onClose, onSaved, projectId, milestone }: MilestoneFormProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [calendarSync, setCalendarSync] = useState<CalendarSync>('off')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setTitle(milestone?.title ?? '')
    setDueDate(milestone?.due_date ?? '')
    setCalendarSync(milestone?.calendar_sync ?? 'off')
  }, [open, milestone])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { title, due_date: dueDate || null, calendar_sync: calendarSync }
    try {
      if (milestone) await updateMilestone(milestone.id, payload)
      else await createMilestone(projectId, payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={milestone ? 'Editar hito' : 'Nuevo hito'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="milestone-form" type="submit" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="milestone-form" onSubmit={submit} className="space-y-4">
        <Field label="Titulo" required>
          <input
            className={inputClass}
            value={title}
            required
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entrega de la Fase 1"
          />
        </Field>

        <Field label="Fecha">
          <input
            className={inputClass}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>

        <CalendarSyncField value={calendarSync} onChange={setCalendarSync} hasDate={Boolean(dueDate)} />

        {error && <p className="text-xs text-red">{error}</p>}
      </form>
    </Modal>
  )
}
