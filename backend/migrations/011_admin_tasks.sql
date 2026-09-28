-- Parte C de la fase 3: tablero administrativo, pendientes fuera de
-- cualquier proyecto. Tabla propia (no cuelga de projects/tasks) porque es
-- exclusivamente para Santi, sin la misma profundidad que el Kanban de
-- proyecto (sin checklist, sin subtareas, sin comentarios/notas por ahora).

create table if not exists admin_tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  status          text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority        text default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to     uuid references users(id),
  created_by      uuid references users(id) not null,
  due_date        date,
  calendar_sync   text default 'off' check (calendar_sync in ('off', 'manual', 'automatic')),
  google_event_id text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
