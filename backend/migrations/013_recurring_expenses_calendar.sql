-- Recordatorios de vencimiento en Google Calendar para gastos recurrentes
-- (Monotributo). Mantenimiento de clientes no necesita columnas nuevas:
-- client_services ya tiene calendar_sync / google_event_id (migracion 012).
alter table recurring_expenses
  add column if not exists dia_vencimiento smallint
    check (dia_vencimiento between 1 and 31),
  add column if not exists calendar_sync text default 'off'
    check (calendar_sync in ('off', 'manual', 'automatic')),
  add column if not exists google_event_id text;
