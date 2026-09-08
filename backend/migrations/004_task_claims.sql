-- Solicitud de tareas: un collaborator pide una tarea sin asignar y un admin
-- aprueba o rechaza.

alter table tasks add column if not exists claim_status text default null
  check (claim_status in ('pending', 'approved', 'rejected') or claim_status is null);
alter table tasks add column if not exists claimed_by uuid references users(id);

-- El admin filtra por solicitudes pendientes en toda la base, no por proyecto.
create index if not exists idx_tasks_claim_status on tasks(claim_status)
  where claim_status = 'pending';
