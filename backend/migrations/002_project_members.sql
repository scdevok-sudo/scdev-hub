-- Acceso por proyecto: membresia explicita en lugar de inferirla de tasks/time_logs.

create table if not exists project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user on project_members(user_id);

-- Backfill: todo usuario que ya participaba (tarea asignada u horas cargadas)
-- queda como miembro, para que nadie pierda acceso al deployar el cambio.
insert into project_members (project_id, user_id)
select distinct project_id, assigned_to
from tasks
where project_id is not null and assigned_to is not null
on conflict (project_id, user_id) do nothing;

insert into project_members (project_id, user_id)
select distinct project_id, user_id
from time_logs
where project_id is not null and user_id is not null
on conflict (project_id, user_id) do nothing;
