# Fase 2e — Kanban de proyecto: sin drag & drop en mobile

Requiere la Fase 2d ya aplicada (la que agregó scroll horizontal con snap
a las columnas en mobile). Ajuste puntual: en mobile, sacar el drag &
drop por completo — no como fallback ante una falla táctil, sino como
decisión de diseño — y reemplazarlo por un control de cambio de estado
directo en la tarjeta, sin tener que abrir el `TaskDrawer`.

Esto es solo para mobile (por debajo de `md`). En desktop el drag & drop
con `@dnd-kit` sigue exactamente igual que hoy, no lo toques.

## 1. Deshabilitar el drag en mobile

En el componente que arma el `DndContext`/`useSensors` del `KanbanBoard`,
condicioná los sensores de puntero/touch a que solo se activen desde
`md` para arriba (mismo breakpoint que ya usás en el resto de la Fase
2d). Una forma simple: leer el ancho de pantalla (podés reusar el mismo
hook/lógica que ya agregaste para el `uiStore` del sidebar mobile, si
ahí ya hay una forma de detectar breakpoint) y no envolver las columnas
en `DndContext` cuando esté en mobile — se renderizan como listas
comunes, sin listeners de drag ni ícono de agarre visual.

## 2. Control de estado en la tarjeta (reemplaza el fallback del Drawer)

Sacá el switcher de 3 botones que agregaste en `TaskDrawer` como
fallback de la Fase 2d — ya no hace falta, queda redundante con lo de
acá.

En su lugar, agregá al `TaskCard` (visible solo en mobile, `md:hidden`
o equivalente) un control compacto de 3 estados (segmented control o
`<select>` simple, lo que se sienta más natural con los componentes
`ui/` existentes) que dispare `PATCH /tasks/{id}` con el nuevo `status`
directo desde la tarjeta, sin necesidad de abrir el drawer. Mismo
endpoint que ya usa el drag & drop de desktop, no crees uno nuevo.

En desktop (`md:` +), el `TaskCard` no muestra este control — ahí se
sigue usando el drag & drop como siempre.

## 3. Qué no cambia

- Las columnas siguen agrupadas visualmente igual que en la Fase 2d
  (scroll horizontal con snap en mobile) — esto es solo sobre cómo se
  cambia de estado, no sobre el layout de columnas.
- El resto de la tarjeta (abrir el drawer con tap, ver asignado,
  prioridad, etc.) no cambia.
- `PATCH /tasks/{id}` no cambia de contrato — el control nuevo llama al
  mismo endpoint que ya existe.
