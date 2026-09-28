# Fase 2b — Seed de datos históricos (clientes, facturas, gastos)

Requiere la Fase 1 y la Fase 2 ya aplicadas (tablas `clients`, `invoices`,
`recurring_expenses` y sus endpoints ya existen). Esto carga los datos
reales que ya tenía Santi en el Dashboard viejo (Apps Script) y en el
Sheet de gastos personal/agencia, para no arrancar el Hub en cero.

Fuentes: el Excel `FinanzasScDev.xlsx` (export del Dashboard viejo, hojas
Proyectos/Gastos/Config/Clientes) que Santi adjunta en el chat, más los
datos que ya confirmó en conversación (ver abajo). Estos NO están en el
repo — pedile a Santi que te pase el Excel si no lo tenés a mano.

## 1. Clientes — insertar directo, sin reconciliar (ya confirmado con Santi)

Tres clientes de la hoja "Proyectos"/"Clientes" del Excel:

1. **Sherpa-Ticketera de reclamos Jose Corral** — Santi confirmó que es el
   mismo cliente que aparece como "Jose corral" en el CRM (proyecto Unidos
   Hacemos). Insertar con los datos completos de la hoja Clientes:
   - `name`: "Sherpa-Ticketera de reclamos Jose Corral"
   - `rubro`: "Gobierno"
   - `ubicacion`: "Capital Federal-Santa Fe"
   - `telefono`: "1123318882"
   - `email`: "Giuliana.redes@gmail.com"
   - `web`: "https://sherpacomunicacion.com.ar/"
   - `estado_pago`: "al_dia"
   - Si el proyecto "Unidos Hacemos" ya existe en `projects` con
     `client_name` parecido, backfillear su `client_id` a este cliente
     también (mismo patrón que la reconciliación de la Fase 1).

2. **RakoStudio-Matías** — ficha mínima, solo `name = "RakoStudio-Matías"`,
   el resto queda nulo (Santi lo completa después).

3. **Cruz del Sur** — ficha mínima, solo `name = "Cruz del Sur"`. Antes de
   insertar, revisá si ya existe un proyecto en `projects` con
   `client_name` parecido a "Cruz del sur" (puede haber uno de Balance)
   — si existe, preguntale a Santi si es el mismo cliente antes de
   linkearlo, no asumas.

## 2. Invoices — insertar directo (4 filas de la hoja "Proyectos")

| Cliente | Servicio | Monto | Fecha | Estado |
|---|---|---|---|---|
| Sherpa-Ticketera de reclamos Jose Corral | Plataforma / sistema a medida | 700000 | 2026-07-10 | cobrado |
| RakoStudio-Matías | Otro | 117500 | 2026-07-19 | cobrado |
| RakoStudio-Matías | Otro | 117500 | 2026-08-06 | cobrado |
| Cruz del Sur | Otro | 400000 | 2026-08-30 | cobrado |

Todas con `anticipo = 0`, `saldo_pendiente = 0` (ya estaban cobradas en el
Excel). `iibb`/`neto` se calculan solos por la columna generada, no los
insertes a mano. `project_id` queda nulo salvo que confirmes el link con
Santi como en el punto 1.

## 3. Gastos recurrentes — NO insertar directo, reconciliar primero

Acá hay datos de **dos fuentes que no coinciden entre sí**, y Santi ya te
dio parte de la clasificación pero no resolvió los conflictos de monto.
Armá una tabla única de candidatos, señalando cada conflicto, y mostrásela
a Santi para que la confirme línea por línea antes de insertar nada en
`recurring_expenses` — mismo criterio que la reconciliación de clientes de
la Fase 1, no asumas un valor cuando hay dos fuentes distintas.

**Fuente A — hoja "Gastos" del Excel (Dashboard viejo, 5 filas):**
| Concepto | Categoría | Monto | Tipo (ya confirmado por Santi) |
|---|---|---|---|
| Monotributo (cuota total) | Monotributo | $61.033 | agencia |
| Suscripción Claude (AI) | Software | $35.000 | agencia |
| Spotify | Software | $5.000 | personal |
| Teléfono | Servicios | $20.000 | personal |
| Obra Social complementaria | Salud | $0 | personal |

**Fuente B — Sheet "Control Financiero", confirmado en conversación:**
- Tab SCdev (agencia): Claude Pro $35.000, Hosting $30.000, Dominios
  $15.000, tuenti $20.000, monotributo $70.000
- Tab Personal: ON FIT La Plata $45.000, Cuota Club Estudiantes de La
  Plata $40.000, psicóloga $60.000, claude $35.000, gemini $10.000,
  spotify $7.000, tuenti $20.000

**Conflictos a resolver con Santi antes de insertar (no los asumas vos):**
- Monotributo: Santi ya confirmó $70.000 como vigente (Fuente B), no
  $61.033 — insertá ese valor, no hace falta volver a preguntarlo.
- Spotify: Fuente A dice $5.000, Fuente B dice $7.000 — preguntale a
  Santi cuál es el vigente.
- "Teléfono $20.000" (Fuente A) vs "tuenti $20.000 personal" (Fuente B):
  mismo monto, probablemente el mismo gasto renombrado, no dos gastos
  distintos — preguntale a Santi si es así antes de insertar ambos (si
  confirma que es el mismo, insertar solo una fila).
- "Suscripción Claude (AI)" (Fuente A, agencia, $35.000) y "Claude Pro"
  (Fuente B, agencia, $35.000): mismo monto y mismo tipo, probablemente
  el mismo gasto documentado en las dos fuentes — no lo dupliques,
  confirmá con Santi que es una sola fila.
- "claude" personal $35.000 (Fuente B) es una suscripción DISTINTA de la
  de agencia — esto ya está confirmado en conversación anterior (Santi
  paga Claude personal y Claude agencia por separado), no es un
  conflicto, insertalo como fila aparte con `tipo='personal'`.

Después de que Santi confirme la lista final, insertá en
`recurring_expenses` con `tipo` y `monto` ya resueltos, `frecuencia =
'mensual'`, `activo = true` — salvo "Obra Social complementaria" con
monto $0, que sugiero insertar con `activo = false` (no se está pagando
actualmente) y que Santi lo reactive cuando tenga el monto real; decíselo
explícito, no lo actives en automático con monto 0.

No toques `expense_log` ni `personal_income` en esta fase — no hay datos
históricos de eso en el Excel, arrancan vacíos.
