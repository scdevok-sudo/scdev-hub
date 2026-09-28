# Fase 2f — Kanban de proyecto en mobile: lista única, no columnas

Requiere la Fase 2e ya aplicada (control de 3 estados en la tarjeta, sin
drag en mobile). Ajuste sobre el layout, no sobre la lógica de estado:
Santi probó la 2e y el problema no era el drag — era que en mobile
seguía habiendo 3 columnas ("Por hacer" con contador, "En progreso",
"Listo") que hay que deslizar horizontalmente para ver, cada una como un
bloque separado con su propio header y scroll. Eso hay que sacarlo del
todo en mobile.

## Qué cambiar

En mobile (por debajo de `md`, mismo breakpoint que toda la Fase 2d/2e):
reemplazar el `KanbanColumn` × 3 con scroll horizontal por **una sola
lista vertical continua** con todas las tareas del proyecto, sin
columnas, sin headers de columna ("POR HACER"/"EN PROGRESO"/"LISTO"),
sin contador por estado, sin scroll horizontal ni snap.

Cada tarjeta se ve igual que hoy (título, módulo, prioridad, checklist
si tiene, autor/asignado, y el control de 3 estados en una fila que ya
armaste en la 2e) — lo único que cambia es que ya no está agrupada
dentro de un contenedor de columna, es un item más de la lista.

**Orden de la lista** (decisión para no dejarlo abierto): tareas `todo`
y `in_progress` primero (mezcladas, ordenadas por prioridad alta→baja y
después por fecha), y las `done` al final de la misma lista — así lo que
falta hacer queda arriba y no hay que scrollear pasando tareas ya
completas para llegar a lo pendiente. No hace falta un separador visual
entre "lo pendiente" y "lo hecho": el control de estado en cada tarjeta
ya deja claro en qué está cada una sin necesitar más chrome.

En desktop (`md:` +) el `KanbanBoard` con las 3 columnas y el drag & drop
sigue exactamente igual que hoy — esto es 100% un cambio de layout
mobile, no toques nada de desktop.

## Implementación

- El fetch de tareas del proyecto no cambia (ya trae todas, sin importar
  estado) — esto es puramente cómo se renderiza, no un endpoint nuevo.
- En el componente que hoy decide "columnas en desktop, columnas
  apiladas/con snap en mobile" (de la Fase 2e), la rama mobile deja de
  iterar por columna: toma el array completo de tareas, lo ordena según
  el criterio de arriba, y lo mapea directo a una lista de `TaskCard`.
- El botón "+ Nueva tarea" que hoy aparece arriba de cada columna queda
  como un solo botón arriba de la lista completa en mobile (no repetido
  tres veces).

## Al pasar, un bug visual que se ve en las capturas

En el `Header` de `ProjectDetail` en mobile, el texto "Proyecto" y el
nombre del proyecto ("Cruz d...") se superponen — parece que el
breadcrumb/título no está adaptado al ancho angosto y el texto se corta
mal. Si es rápido de arreglar de paso (probablemente el mismo
`Header`/`PageWrapper` que ya tocaste en la 2d, ajustando cómo trunca el
título en mobile), arreglalo; si no, dejalo anotado para que Santi lo
revise aparte, no bloquees esta fase por eso.
