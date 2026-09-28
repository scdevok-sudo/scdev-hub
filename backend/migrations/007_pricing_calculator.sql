-- Calculadora de precio: reemplaza la Calculadora del Dashboard viejo con
-- tarifas propias de SCdev. Es una simulacion (no persiste cotizaciones).

create table if not exists pricing_config (
  id                             uuid primary key default gen_random_uuid(),
  tarifa_hora_estandar           numeric(12,2) not null default 15000,
  tarifa_hora_scope_creep        numeric(12,2) not null default 25000,
  tasa_iibb                      numeric(5,4) not null default 0.05,
  dolar_oficial                  numeric(12,2),
  descuento_alianza_balance_min  numeric(5,4) default 0.10,
  descuento_alianza_balance_max  numeric(5,4) default 0.15,
  updated_at                     timestamptz default now()
);

create table if not exists catalog_presets (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  tipo_precio      text not null check (tipo_precio in ('fijo', 'por_hora')),
  precio_fijo      numeric(12,2),
  horas_estimadas  numeric(6,2),
  activo           boolean default true
);

create table if not exists hosting_tiers (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  precio_mensual  numeric(12,2) not null,
  orden           int default 0
);

-- Fila unica (singleton): tarifas vigentes al 19/09/2026, reemplazan la
-- banda vieja ($6.700-$10.000/hora) que ya no aplica.
insert into pricing_config (
  tarifa_hora_estandar, tarifa_hora_scope_creep, tasa_iibb,
  descuento_alianza_balance_min, descuento_alianza_balance_max
)
select 15000, 25000, 0.05, 0.10, 0.15
where not exists (select 1 from pricing_config);

insert into catalog_presets (nombre, tipo_precio, precio_fijo, horas_estimadas, activo)
select * from (values
  ('Web esencial', 'fijo', 80000::numeric, null::numeric, true),
  ('Rediseño corporativo', 'fijo', 800000::numeric, null::numeric, true),
  ('Sistema a medida', 'por_hora', null::numeric, null::numeric, true),
  ('Mantenimiento mensual', 'fijo', 180000::numeric, null::numeric, true)
) as seed(nombre, tipo_precio, precio_fijo, horas_estimadas, activo)
where not exists (select 1 from catalog_presets);

insert into hosting_tiers (nombre, precio_mensual, orden)
select * from (values
  ('Landing / web estatica', 10000::numeric, 1),
  ('Web con CMS o backend simple', 12000::numeric, 2),
  ('App con backend custom', 15000::numeric, 3),
  ('App con base de datos + integraciones', 17500::numeric, 4)
) as seed(nombre, precio_mensual, orden)
where not exists (select 1 from hosting_tiers);
