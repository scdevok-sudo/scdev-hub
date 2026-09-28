-- Parte B de la fase 3: notas por tarea, separadas de la descripcion.
--
-- Decision de diseno (no vino resuelta en el documento): en vez de crear
-- `task_notes` como tabla nueva, idéntica en forma y comportamiento a
-- `task_comments` (mismas columnas salvo el nombre, mismo patron GET+POST
-- sin PATCH/DELETE, ambas son un log inmutable), se agrega un campo `tipo`
-- discriminador a `task_comments` existente. Evita duplicar modelo,
-- schema y router para una tabla idéntica. La separacion que pide el
-- documento ("separadas de comentarios") queda igual de firme a nivel API
-- (/tasks/{id}/notes vs /tasks/{id}/comments, cada uno filtra por tipo) y
-- de UI (dos secciones distintas en el TaskDrawer) -- lo unico compartido
-- es el storage.

alter table task_comments add column if not exists tipo text not null default 'comment'
  check (tipo in ('comment', 'note'));
