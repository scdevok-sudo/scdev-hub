-- Habilitar extensión para UUIDs
create extension if not exists "pgcrypto";

-- USERS
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text not null,
  avatar_url  text,
  google_id   text unique,
  role        text not null default 'collaborator' check (role in ('admin', 'collaborator')),
  created_at  timestamptz default now()
);

-- Insertar los 4 miembros del equipo (google_id se completa en el primer login)
-- REEMPLAZAR los emails con los reales antes de ejecutar
insert into users (email, name, role) values
  ('santi@ejemplo.com',    'Santi Cáceres',     'admin'),
  ('lucas@ejemplo.com',    'Lucas Fernández',   'collaborator'),
  ('ezequiel@ejemplo.com', 'Ezequiel Weber',    'collaborator'),
  ('agustin@ejemplo.com',  'Agustín Mazzoni',  'collaborator')
on conflict (email) do nothing;

-- PROJECTS
create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  client_name     text not null,
  description     text,
  status          text not null default 'active' check (status in ('active', 'paused', 'completed')),
  structure_pct   numeric(5,4) not null default 0.25,
  billed_amount   numeric(12,2) default 0,
  estimated_hours numeric(8,2),
  created_by      uuid references users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- TASKS
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to  uuid references users(id),
  created_by   uuid references users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- TASK COMMENTS
create table if not exists task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks(id) on delete cascade,
  user_id    uuid references users(id),
  content    text not null,
  created_at timestamptz default now()
);

-- TIME LOGS
create table if not exists time_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  user_id     uuid references users(id),
  task_id     uuid references tasks(id),
  description text not null,
  hours       numeric(5,2) not null check (hours >= 0.25 and hours <= 24),
  logged_date date not null default current_date,
  created_at  timestamptz default now()
);

-- Índices para queries frecuentes
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_assigned on tasks(assigned_to);
create index if not exists idx_time_logs_project on time_logs(project_id);
create index if not exists idx_time_logs_user on time_logs(user_id);
create index if not exists idx_time_logs_date on time_logs(logged_date);
