-- Detalle largo y checklist por tarea.
-- checklist: [{"id": "1", "text": "...", "done": false}, ...]

alter table tasks add column if not exists details text;
alter table tasks add column if not exists checklist jsonb default '[]'::jsonb;

-- Filas viejas quedan con null; normalizar a array vacio para no romper el front.
update tasks set checklist = '[]'::jsonb where checklist is null;

-- El front asume siempre un array: cerrar la puerta a nulls futuros.
alter table tasks alter column checklist set not null;
