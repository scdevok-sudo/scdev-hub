-- Modulo de finanzas, gastos y clientes (solo schema por ahora, sin endpoints
-- ni UI). Normaliza "cliente" como entidad propia (antes era client_name
-- texto libre en projects) y agrega facturacion, gastos e ingresos.

create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rubro       text,
  ubicacion   text,
  telefono    text,
  email       text,
  instagram   text,
  web         text,
  estado_pago text not null default 'al_dia'
              check (estado_pago in ('al_dia', 'pendiente', 'atrasado')),
  notas       text,
  created_at  timestamptz default now()
);

-- Nullable por ahora: se backfillea recien cuando se confirme la
-- reconciliacion de client_name -> clients (ver seccion 2 de
-- fase-1-schema-finanzas.md). No borrar projects.client_name todavia.
alter table projects add column if not exists client_id uuid references clients(id);

create table if not exists invoices (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id),
  project_id       uuid references projects(id),
  servicio         text,
  monto            numeric(12,2) not null,
  -- tasa IIBB 5%: iibb = monto * (0.05/0.95). Verificado linea a linea contra
  -- scdev-dashboard-appscript.gs: nuevoProyecto, updateProyecto y getResumen
  -- usan los tres la misma formula `monto * (tasa/(1-tasa))` con
  -- `tasa = config.tasa_iibb || 0.05` -- con el default actual (0.05) da
  -- exactamente monto*(0.05/0.95), sin divergencia entre las tres funciones.
  -- Nota: en el Apps Script `tasa_iibb` es configurable por hoja de Config;
  -- aca queda hardcodeada al 5% (el valor real usado hoy) porque invoices no
  -- tiene un campo de tasa por fila -- si algun dia se cambia el 5% en la
  -- planilla, esta columna generada quedaria desactualizada y habria que
  -- migrar a un campo `tasa` en vez de una constante.
  iibb             numeric(12,2) generated always as (monto * (0.05 / 0.95)) stored,
  neto             numeric(12,2) generated always as (monto - monto * (0.05 / 0.95)) stored,
  anticipo         numeric(12,2) default 0,
  saldo_pendiente  numeric(12,2) default 0,
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente', 'parcial', 'cobrado')),
  fecha            date not null,
  fecha_seguimiento date,
  notas            text,
  created_by       uuid references users(id),
  created_at       timestamptz default now()
);

create table if not exists client_services (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid not null references clients(id),
  servicio                  text not null,
  monto_mensual             numeric(12,2),
  fecha_inicio              date,
  proxima_fecha_vencimiento date,
  recurrencia               text not null default 'mensual'
                            check (recurrencia in ('mensual', 'anual', 'unico')),
  estado                    text not null default 'activo'
                            check (estado in ('activo', 'pausado', 'cancelado'))
);

-- Monto fijo en ARS, editable a mano por Santi cada 2-3 meses (inflacion).
-- Decision explicita: no agregar moneda ni tipo de cambio.
create table if not exists recurring_expenses (
  id          uuid primary key default gen_random_uuid(),
  concepto    text not null,
  categoria   text,
  monto       numeric(12,2) not null,
  tipo        text not null check (tipo in ('personal', 'agencia')),
  frecuencia  text default 'mensual',
  activo      boolean default true
);

create table if not exists expense_log (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  concepto    text not null,
  categoria   text,
  monto       numeric(12,2) not null,
  tipo        text not null check (tipo in ('personal', 'agencia')),
  project_id  uuid references projects(id),
  created_by  uuid references users(id)
);

create table if not exists personal_income (
  id          uuid primary key default gen_random_uuid(),
  concepto    text not null,
  monto       numeric(12,2) not null,
  fecha       date not null,
  recurrente  boolean default false,
  fuente      text,
  created_by  uuid references users(id)
);

create index if not exists idx_invoices_client on invoices(client_id);
create index if not exists idx_invoices_project on invoices(project_id);
create index if not exists idx_client_services_client on client_services(client_id);
create index if not exists idx_expense_log_project on expense_log(project_id);
create index if not exists idx_expense_log_fecha on expense_log(fecha);
create index if not exists idx_personal_income_fecha on personal_income(fecha);

-- RLS: primera vez que se usa en este proyecto (las 4 migraciones anteriores
-- no tienen ninguna politica -- ver gap 5 de INVESTIGACION-HUB.md). El
-- backend de FastAPI se conecta con DATABASE_URL usando el rol `postgres`
-- (superusuario en Supabase), que siempre bypassea RLS -- por eso esto no
-- cambia en nada el comportamiento actual de la app ni requiere tocar
-- deps.py/require_admin. Lo que SI bloquea es exactamente el escenario que
-- describe INVESTIGACION-HUB.md: un consumidor nuevo que hable directo con
-- Supabase via anon/authenticated key (supabase-js desde el frontend, un
-- script, otra app) sin pasar por este backend.
--
-- No hay Supabase Auth en este proyecto (el login es Google OAuth + JWT
-- propio via authlib, no supabase.auth), asi que no existe un auth.uid() con
-- el que distinguir admin/collaborator dentro de una policy de Postgres. La
-- distincion real de roles sigue viviendo exclusivamente en
-- app/core/deps.py (require_admin), como ya documenta INVESTIGACION-HUB.md
-- seccion 2. Estas policies solo agregan una capa de "nadie que no sea este
-- backend puede leer o escribir" -- no reproducen el matiz admin/collaborator
-- a nivel fila.
alter table invoices enable row level security;
alter table recurring_expenses enable row level security;
alter table expense_log enable row level security;
alter table personal_income enable row level security;

-- Sin policies para anon/authenticated: con RLS activado y ninguna policy
-- que matchee esos roles, quedan denegados por default. `postgres` sigue
-- pasando de largo por ser superusuario/owner de la tabla.

-- clients y client_services quedan sin RLS restrictiva (mismo criterio que
-- el resto del schema actual): no son datos sensibles al nivel de facturacion
-- y hoy no hay forma de mapear "collaborator con acceso al proyecto" a un rol
-- de Postgres sin Supabase Auth. Si en el futuro se agrega un consumidor
-- directo via anon key, revisar esto junto con el resto del gap de RLS.
