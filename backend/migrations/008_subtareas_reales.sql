-- Parte A de la fase 3: subtareas reales (fila propia en tasks, no un item
-- de checklist jsonb). No se borra `checklist` todavia -- se deja de leer
-- desde el frontend pero la columna queda por si hay que revertir.

alter table tasks add column if not exists parent_task_id uuid references tasks(id) on delete cascade;
alter table tasks add column if not exists due_date date;
alter table tasks add column if not exists calendar_sync text default 'off'
  check (calendar_sync in ('off', 'manual', 'automatic'));
alter table tasks add column if not exists google_event_id text;

create index if not exists idx_tasks_parent on tasks(parent_task_id);
