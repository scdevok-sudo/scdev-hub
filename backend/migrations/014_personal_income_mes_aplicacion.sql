-- Ingresos a mes vencido: `fecha` sigue siendo la fecha real de cobro (auditoria),
-- `mes_aplicacion` es el mes (siempre dia 1) al que el ingreso cuenta para el balance.
-- `a_mes_vencido` marca los sueldos: el backend les calcula mes_aplicacion = mes de
-- `fecha` + 1 salvo que se edite a mano.

alter table personal_income add column if not exists a_mes_vencido boolean not null default false;
alter table personal_income add column if not exists mes_aplicacion date;

-- Backfill: ninguno esta marcado como a mes vencido todavia, asi que cada ingreso
-- cuenta en el mes de su fecha. (Los sueldos se marcan despues desde la app.)
update personal_income
   set mes_aplicacion = date_trunc('month', fecha)::date
 where mes_aplicacion is null;

alter table personal_income alter column mes_aplicacion set not null;

alter table personal_income drop constraint if exists personal_income_mes_aplicacion_dia1_check;
alter table personal_income
  add constraint personal_income_mes_aplicacion_dia1_check
  check (extract(day from mes_aplicacion) = 1);

create index if not exists idx_personal_income_mes_aplicacion on personal_income(mes_aplicacion);
