-- Backfill de reconciliacion cliente <-> proyectos (fase-1-schema-finanzas.md,
-- seccion 2). Unico caso real detectado en production al momento de escribir
-- esto: "Cruz del Sur -- Fase 1" y "Cruz del Sur -- Fase 2" son el mismo
-- cliente, con client_name escrito con un typo distinto en cada proyecto
-- ("Cosultorio Medica" vs "Consultorio Medico"). Confirmado con Santi antes
-- de correr esto -- ver fase-1-schema-finanzas.md seccion 2 ("no asumas
-- nada").

insert into clients (name)
select 'Cruz del Sur Consultorio Médico'
where not exists (
  select 1 from clients where name = 'Cruz del Sur Consultorio Médico'
);

update projects
set client_id = (select id from clients where name = 'Cruz del Sur Consultorio Médico')
where client_name in ('Cruz del Sur Consultorio Médico', 'Cruz del Sur Cosultorio Médica')
  and client_id is null;
