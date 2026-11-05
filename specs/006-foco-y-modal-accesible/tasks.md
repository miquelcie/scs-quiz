# Tasks 006 — Gestión de foco y modal accesible

- **Spec:** `specs/006-foco-y-modal-accesible/spec.md`
- **Plan:** `specs/006-foco-y-modal-accesible/plan.md`
- **Estado:** completado (2026-11-05)
- **Fecha:** 2026-11-03
- **Dependencias externas:** 002 (salidas a la portada) y 003 (confirmación de descarte). T01–T07 y T09–T11 no bloquean; T08 se completa cuando existan esas acciones.

> Convención: una tarea se marca `[x]` únicamente cuando se cumple su línea **Hecho cuando**. Cada tarea está pensada para 20–30 minutos.

## Cobertura RF

| RF | Tareas |
| --- | --- |
| R1 — modal cerrado con `hidden` | T01, T02, T05, T11 |
| R2 — sin `aria-hidden` dinámico | T01, T04, T09 |
| R3 — nombre y descripción accesibles | T01 |
| R4 — foco inicial en «Aceptar» | T04 |
| R5 — *focus trap* | T03, T06, T10 |
| R6 — `Escape` global | T06 |
| R7 — fondo `inert` | T04 |
| R8 — bloqueo de scroll | T02, T04 |
| R9 — restaurar foco al cerrar | T05 |
| R10 — foco visible tras confirmar | T08 |
| R11 — sin warning de `aria-hidden` | T05, T09 |
| R12 — foco al cambiar de pantalla | T01, T02, T07 |
| R13 — foco sin scroll adicional | T02, T07, T11 |

## Tareas

- [x] **T01 — Actualizar la estructura del modal y de las pantallas en `index.html`**
  - **RF:** R1, R2, R3, R12
  - **Depende de:** —
  - **Archivos:** `index.html`
  - **Estimación:** 25 min
  - **Hecho cuando:** `#custom-modal` tiene `hidden` inicial, `aria-labelledby="modal-title"` y `aria-describedby="modal-msg"`; no tiene `aria-hidden` dinámico; las cuatro pantallas tienen `tabindex="-1"`.

- [x] **T02 — Añadir las reglas CSS de ocultación, scroll y foco de pantalla**
  - **RF:** R1, R8, R12, R13
  - **Depende de:** T01
  - **Archivos:** `css/styles.css`
  - **Estimación:** 25 min
  - **Hecho cuando:** `.modal-overlay[hidden] { display: none; }` vence a `display:flex`; existe una clase de bloqueo de scroll en `body`; las pantallas no muestran anillo visual al recibir foco programático (excepción acordada: el foco se mantiene para lectores de pantalla); abrir el modal bloquea el scroll y cerrarlo lo restaura.

- [x] **T03 — Implementar `nextFocusIndex()` y sus tests**
  - **RF:** R5
  - **Depende de:** —
  - **Archivos:** `js/engine.js`, `tests/cu-07/foco-modal.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** avanzar desde 0 devuelve 1 y desde 1 devuelve 0; retroceder invierte el ciclo; con un solo control devuelve 0; con `total = 0` devuelve 0 sin lanzar; un índice actual fuera de rango se normaliza; `node --test tests/cu-07` en verde.

- [x] **T04 — Reescribir `abrirModal()`**
  - **RF:** R2, R4, R7, R8
  - **Depende de:** T01, T02
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** guarda el disparador, rellena título y mensaje con `textContent`, quita `hidden`, aplica `inert` a `header`, `main` y `footer`, añade la clase de bloqueo de scroll y enfoca siempre `#modal-confirm`; no aplica `aria-hidden`.

- [x] **T05 — Reescribir `cerrarModal(restaurarFoco)`**
  - **RF:** R1, R9, R11
  - **Depende de:** T04
  - **Archivos:** `js/app.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** vuelve a poner `hidden`, retira `inert`, quita el bloqueo de scroll y elimina el listener de teclado; con `restaurarFoco = true` devuelve el foco al disparador si sigue visible y, si no, a la pantalla activa; no queda foco dentro del modal oculto.

- [x] **T06 — Implementar el *focus trap* y `Escape` global**
  - **RF:** R5, R6
  - **Depende de:** T03, T04, T05
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** `Tab` cicla Aceptar → Cancelar → Aceptar y `Shift+Tab` al revés usando `nextFocusIndex()`; `Escape` cierra aunque el foco esté fuera del modal; el listener se registra solo mientras el modal está abierto y se retira al cerrar.

- [x] **T07 — Mover el foco en `switchScreen()` y respetar el orden render → pantalla**
  - **RF:** R12, R13
  - **Depende de:** T01, T02
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** `switchScreen()` quita `.active`, activa la pantalla, hace `scrollTo(0,0)` y enfoca el contenedor con `preventScroll`; `renderResults()`, `renderHistoryScreen()`, `renderLastAttempt()` y `startQuiz()` se ejecutan antes de `switchScreen()`.

- [x] **T08 — Aplicar los destinos de foco tras confirmar**
  - **RF:** R10
  - **Depende de:** T05, T07 y las acciones de 002/003
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** finalizar test enfoca `#screen-results`; descartar examen, `#btn-start-quiz`; borrar historial, `#btn-clear-history`; eliminar intento, `#screen-history` o su encabezado si queda vacío; confirmar el descarte de 003, `#screen-quiz`; en ningún caso el foco queda en el modal oculto.

- [x] **T09 — Retirar el `aria-hidden` dinámico y el `cleanup` antiguo**
  - **RF:** R2, R11
  - **Depende de:** T04, T05
  - **Archivos:** `js/app.js`, `index.html`
  - **Estimación:** 20 min
  - **Hecho cuando:** no queda ninguna asignación dinámica de `aria-hidden` sobre `#custom-modal` ni sobre el fondo; el flujo completo no emite «Blocked aria-hidden» en consola.

- [x] **T10 — Documentar CU-07 en `AGENTS.md`**
  - **RF:** R5
  - **Depende de:** T03
  - **Archivos:** `AGENTS.md`
  - **Estimación:** 15 min
  - **Hecho cuando:** `tests/cu-07/` figura en la estructura y CU-07 aparece en la lista de casos cubiertos junto a los tests del ciclo de foco.

- [x] **T11 — Verificación manual de accesibilidad y evidencia**
  - **RF:** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13
  - **Depende de:** T06, T07, T08, T09
  - **Archivos:** `MEMORY.md`
  - **Estimación:** 30 min
  - **Hecho cuando:** se ejecuta el checklist del plan §8 (Tab, Shift+Tab, Escape, `inert`, árbol de accesibilidad, destinos de foco, consola sin warnings), se comprueba a 375 px sin scroll adicional y la evidencia queda registrada en `MEMORY.md`.

## Cierre de la implementación (2026-11-05)

- **Estado:** completado. Primero se añadieron los tests de `nextFocusIndex`; después se implementaron el ciclo puro, la estructura del modal y de las pantallas, el CSS y la gestión de foco en `app.js`.
- **Tests:** `node --test` → **94/94 en verde** (86 previos + 8 nuevos de CU-07).
- **Ciclo de foco:** `nextFocusIndex(0, 2, false) === 1`, `nextFocusIndex(1, 2, false) === 0`, retroceso invertido, un control y `total = 0` devuelven `0`, y un índice inválido se normaliza al primero.
- **Modal cerrado:** `hidden` + `.modal-overlay[hidden] { display: none; }`; `getComputedStyle` devuelve `display: none` y los botones tienen 0 rects, por lo que no son tabulables.
- **Modal abierto:** foco en `#modal-confirm`, `inert` en `header`/`main`/`footer`, `body.modal-open` con `overflow: hidden`, `aria-labelledby="modal-title"` y `aria-describedby="modal-msg"`.
- **Árbol de accesibilidad:** `dialog "Borrar historial local" description="¿Deseas borrar todo el historial de exámenes?" modal`, con solo los botones Cancelar/Aceptar y el fondo fuera del árbol.
- **Teclado:** `Tab` Aceptar → Cancelar → Aceptar; `Shift+Tab` en sentido inverso; `Escape` cierra aunque el foco esté en Cancelar y devuelve el foco al disparador visible.
- **Destinos tras confirmar:** finalizar test → `#screen-results`; descartar examen → `#btn-start-quiz`; borrar historial → `#btn-clear-history`; eliminar intento → `#screen-history`; confirmar «Examen en curso» → `#screen-quiz`. En ningún caso el foco queda en el modal oculto.
- **Consola:** sin mensajes ni warnings de «Blocked aria-hidden».
- **Vista móvil:** 375 px reales vía CDP (`innerWidth: 375`, `scrollWidth: 375`); modal de 343 px dentro del viewport, scroll bloqueado al abrir y restaurado al cerrar, cuatro pantallas sin desbordamiento y `scrollY: 0` tras el foco programático.
- **Excepción posterior (2026-11-05):** se retira el anillo azul de `.screen:focus`. La pantalla sigue recibiendo el foco programático (`tabindex="-1"` + `focus({ preventScroll: true })`) para que el lector de pantalla anuncie el cambio, pero no se pinta un borde visible. Los controles interactivos conservan su `:focus-visible`. Decisión de UX acordada con el usuario.
