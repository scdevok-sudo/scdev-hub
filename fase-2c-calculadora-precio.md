# Fase 2c — Calculadora de precio

Requiere Fase 1 y Fase 2 ya aplicadas. Reemplaza la "Calculadora" del
Dashboard viejo (Apps Script) por una versión propia en el Hub, ya
configurada con las tarifas vigentes de SCdev en vez de valores genéricos.

## 1. Schema nuevo

```sql
CREATE TABLE pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarifa_hora_estandar numeric(12,2) NOT NULL DEFAULT 15000,
  tarifa_hora_scope_creep numeric(12,2) NOT NULL DEFAULT 25000,
  tasa_iibb numeric(5,4) NOT NULL DEFAULT 0.05,
  dolar_oficial numeric(12,2),
  descuento_alianza_balance_min numeric(5,4) DEFAULT 0.10,
  descuento_alianza_balance_max numeric(5,4) DEFAULT 0.15,
  updated_at timestamptz DEFAULT now()
);
-- fila única (singleton), admin puede editar los valores vigentes

CREATE TABLE catalog_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo_precio text CHECK (tipo_precio IN ('fijo','por_hora')) NOT NULL,
  precio_fijo numeric(12,2),
  horas_estimadas numeric(6,2),
  activo boolean DEFAULT true
);

CREATE TABLE hosting_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio_mensual numeric(12,2) NOT NULL,
  orden int DEFAULT 0
);
```

Seed inicial de `catalog_presets` con los precios del catálogo (fuente:
`guia_presupuestos_scdev.md` y catálogo 2026 — pedile a Santi el PDF si
hace falta el detalle completo, esto es lo ya conocido):
- "Web esencial" — fijo, $80.000–$100.000 (usar el piso $80.000 como
  default, Santi ajusta)
- "Rediseño corporativo" — fijo, $800.000
- "Sistema a medida" — por_hora, tarifa estándar × horas (sin monto fijo)
- "Mantenimiento mensual" — fijo, $180.000

Seed de `hosting_tiers` (de la guía de presupuestos):
- "Landing / web estática" — $10.000/mes
- "Web con CMS o backend simple" — $12.000/mes
- "App con backend custom" — $15.000/mes
- "App con base de datos + integraciones" — $15.000–20.000/mes (usar
  $17.500 como punto medio default)

Seed de `pricing_config` (fila única): `tarifa_hora_estandar = 15000`,
`tarifa_hora_scope_creep = 25000`, `tasa_iibb = 0.05`,
`descuento_alianza_balance_min = 0.10`, `descuento_alianza_balance_max =
0.15`. Esta tarifa reemplaza la banda vieja ($6.700-$10.000/hora) que ya
no aplica según la guía actualizada el 19/09/2026.

## 2. Backend

- `GET/PATCH /pricing-config` — solo admin, singleton
- `GET /catalog-presets`, `POST/PATCH/DELETE /catalog-presets/{id}` —
  solo admin
- `GET /hosting-tiers`, `POST/PATCH/DELETE /hosting-tiers/{id}` — solo
  admin
- `POST /calculadora/simular` — recibe `{ preset_id? , horas?,
  tarifa_hora?, gastos_directos, incluir_hosting_tier_id?,
  alianza_balance: bool, cliente_id? }` y devuelve el desglose completo:
  ```
  subtotal = preset.precio_fijo || (horas * tarifa_hora)
  subtotal_con_hosting = subtotal + (hosting_tiers.precio_mensual si aplica)
  descuento = subtotal_con_hosting * descuento_alianza (si alianza_balance)
  base = subtotal_con_hosting - descuento + gastos_directos
  iibb = base * (tasa_iibb / (1 - tasa_iibb))
  total = base + iibb
  margen_pct = (base - gastos_directos) / total * 100   // para el semáforo
  ```
  No persiste nada — es una simulación, igual que la Calculadora vieja.
  Si `cliente_id` viene seteado, la respuesta puede incluir el nombre del
  cliente para prellenar el presupuesto, pero no crea ninguna fila en
  `invoices` automáticamente (eso es una acción manual aparte, "convertir
  en factura", fuera de esta fase).

## 3. Frontend

Nueva página `/calculadora` en el sidebar (reemplaza conceptualmente a la
del Dashboard viejo, no la migres 1:1 — mejorala):
- Selector de preset del catálogo (autocompleta precio fijo u horas según
  el tipo) o modo manual (horas + tarifa, con la tarifa estándar
  precargada desde `pricing_config`, editable)
- Selector de tramo de hosting (opcional, "sin hosting" por default)
- Toggle "Alianza Balance" que aplica el descuento configurado
- Input de gastos directos del proyecto
- Selector de cliente existente (opcional, de `GET /clients`) para dejar
  registrado a quién se le cotizó, aunque no se persista la cotización
- Desglose completo en pantalla: subtotal, hosting, descuento si aplica,
  gastos directos, IIBB, total — mismo semáforo de margen que la
  Calculadora vieja (verde ≥30%, ámbar ≥15%, rojo <15%)
- Botón "Copiar desglose" (al portapapeles, formato texto simple) para
  que Santi lo pueda pegar directo en un mensaje o en el generador de
  presupuestos — no genera el .docx del presupuesto formal en esta fase,
  eso sigue siendo un paso aparte con la guía de presupuestos existente

No es necesario reproducir la generación de PDF de presupuesto para
cliente que tenía la Calculadora vieja — Santi ya arma esos presupuestos
aparte, en el formato de `guia_presupuestos_scdev.md`. Si más adelante
quiere que el Hub genere el .docx directo, es una fase futura a pedir
explícitamente.
