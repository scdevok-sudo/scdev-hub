# Fase 2d — Responsive (uso desde celular)

Requiere la Fase 2 ya aplicada. Antes de sumar más UI en la Fase 3
(subtareas anidadas, tablero admin, mejoras al drawer), el Hub tiene que
verse bien en pantalla de celular — hoy no hay ninguna clase responsive
en los componentes de layout (`Sidebar` fija, tablas sin scroll, etc.).

Tailwind v4 ya está configurado con los tokens en `@theme` — usá los
breakpoints estándar (`sm:640px`, `md:768px`, `lg:1024px`), no inventes
breakpoints custom salvo que algo lo justifique explícitamente.

## 1. Sidebar — excepción explícita a una decisión ya tomada

`CLAUDE.md` y la Fase 1 documentan "Sidebar fija a la izquierda, no
colapsable" como decisión de UX ya resuelta — **eso sigue valiendo para
desktop** (`md:` para arriba). Para mobile, agregá el comportamiento que
falta, no reviertas la decisión de desktop:

- Por debajo de `md`, la `Sidebar` pasa a ser un drawer off-canvas
  (oculto por default, `translate-x-full` o similar), con un botón
  hamburguesa nuevo en `Header` que la abre/cierra.
- Al navegar a una ruta nueva desde el drawer, se cierra solo.
- Overlay semitransparente detrás del drawer que cierra al tocarlo,
  mismo patrón que ya usa `Modal` (`createPortal`, `fixed inset-0`).
- En `md:` para arriba, el drawer/hamburguesa no se muestran — la
  sidebar vuelve a estar siempre visible como hoy.

## 2. PageWrapper y layout general

- Padding lateral menor en mobile (`px-4` en vez de lo que use hoy en
  desktop), para no desperdiciar ancho de pantalla.
- Verificar que ningún contenedor tenga un ancho fijo en px que rompa en
  pantallas angostas (< 400px) — usar `w-full` + `max-w-*` en vez de
  anchos fijos donde aparezcan.

## 3. Tablas (facturas, gastos, time logs)

Las tablas de `Finanzas` (invoices), `TimeLogTable` y las listas de
gastos NO deben forzar scroll horizontal como única solución — eso es
aceptable como fallback pero no como diseño principal. Para cada tabla:
- En mobile, transformar cada fila en una card apilada (label + valor en
  vez de columnas), reusando los datos que ya trae el componente — no
  dupliques la lógica de fetch, solo el layout de presentación por
  breakpoint (`hidden md:table` para la tabla clásica, `md:hidden` para
  la versión de cards).
- Las acciones inline (marcar cobrado, editar monto de gasto) tienen que
  seguir siendo accesibles en la versión mobile, con el mismo alcance de
  toque razonable (no botones de 20px).

## 4. Kanban

El `KanbanBoard` de proyecto (3 columnas fijas) no entra en pantalla de
celular con las 3 columnas visibles a la vez. Resolver con scroll
horizontal por columna con snap (`snap-x snap-mandatory`, cada columna
`snap-center` y `min-w-[85vw]` o similar en mobile), no apilar las 3
columnas verticalmente — perdería la referencia visual de "cuántas hay en
cada estado". El drag & drop entre columnas en mobile puede degradarse a
"mover con un botón/menú" si `@dnd-kit` no anda bien con touch — probalo
primero, no asumas que el drag táctil funciona sin ajuste.

## 5. TaskDrawer y modales

- `TaskDrawer` (panel deslizante desde la derecha en desktop) pasa a
  ocupar el 100% del ancho/alto en mobile (`inset-0` en vez de un panel
  angosto) — es más usable como pantalla completa que como panel
  angosto en una pantalla chica.
- Los formularios modales (`ProjectForm`, `TaskForm`, `TimeLogForm`)
  mismo criterio: full-screen en mobile, modal centrado en desktop.

## 6. Verificación

`tsc`/`build` sin errores no valida layout — es una condición necesaria,
no suficiente. Santi va a revisar visualmente él mismo desde su celular
y desde el navegador achicando la ventana, así que no hace falta que
generes capturas de pantalla; avisale cuando esté listo para que lo
chequee.
