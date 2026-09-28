-- Parte E de la fase 3: integracion con Google Calendar.

-- Encriptado a nivel aplicacion (Fernet, app/core/crypto.py) antes de guardar,
-- nunca en texto plano. No habia ningun mecanismo de secretos/encriptacion en
-- el proyecto antes de esto -- se agrego GOOGLE_TOKEN_ENCRYPTION_KEY.
alter table users add column if not exists google_refresh_token text;

-- El documento de la fase asumia que invoices/client_services ya tenian
-- google_event_id de una fase anterior -- se verifico contra la base real
-- (information_schema.columns) y NO es asi: ninguna de las dos tablas tenia
-- esa columna todavia. Se agregan las dos junto con calendar_sync.
alter table invoices add column if not exists calendar_sync text default 'off'
  check (calendar_sync in ('off', 'manual', 'automatic'));
alter table invoices add column if not exists google_event_id text;
alter table client_services add column if not exists calendar_sync text default 'off'
  check (calendar_sync in ('off', 'manual', 'automatic'));
alter table client_services add column if not exists google_event_id text;

create table if not exists project_milestones (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null,
  title           text not null,
  due_date        date,
  calendar_sync   text default 'off' check (calendar_sync in ('off', 'manual', 'automatic')),
  google_event_id text,
  created_by      uuid references users(id)
);

create index if not exists idx_project_milestones_project on project_milestones(project_id);
