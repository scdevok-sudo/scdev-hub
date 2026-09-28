-- Backfill de checklist jsonb -> subtareas reales (fase-3, Parte A, seccion 2).
-- Idempotente: solo migra tareas madre que todavia no tengan subtareas
-- creadas por este backfill (evita duplicar si se corre mas de una vez).

insert into tasks (project_id, parent_task_id, title, status, priority, created_by)
select
  t.project_id,
  t.id as parent_task_id,
  item ->> 'text' as title,
  case when (item ->> 'done')::boolean then 'done' else 'todo' end as status,
  'medium' as priority,
  t.created_by
from tasks t
cross join lateral jsonb_array_elements(t.checklist) as item
where jsonb_array_length(t.checklist) > 0
  and not exists (
    select 1 from tasks child where child.parent_task_id = t.id
  );
