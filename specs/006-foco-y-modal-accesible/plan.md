# Plan 006 — Gestión de foco y modal accesible

- **Spec:** `specs/006-foco-y-modal-accesible/spec.md`
- **Estado:** propuesto
- **Fecha:** 2026-11-03
- **Dependencias:** 002 y 003 (acciones que abren el modal); 001 no interviene
- **Principios constitucionales:** 2, 3, 4, 5, 6

> Nota de alcance: no se incluye «mapa» ni parámetro «hoy»; no aplican a este cambio (acordado con el usuario).

## 1. Trazabilidad RF → partes

| RF | Dónde se cubre | Verificación |
| --- | --- | --- |
| R1 — modal cerrado con `hidden` | `index.html` + `css/styles.css` | manual (Tab) |
| R2 — sin `aria-hidden` dinámico | `index.html` + `showModal`/`cerrarModal` | manual + consola |
| R3 — nombre y descripción accesibles | `index.html` | manual (árbol de accesibilidad) |
| R4 — foco inicial en «Aceptar» | `abrirModal()` | manual |
| R5 — *focus trap* | `manejarTecla()` + `nextFocusIndex()` | `tests/cu-07` + manual |
| R6 — `Escape` global | listener en `document` mientras el modal está abierto | manual |
| R7 — fondo `inert` | `aplicarInert()`/`quitarInert()` | manual |
| R8 — bloqueo de scroll | clase en `body` + restauración | manual |
| R9 — restaurar foco al cerrar | `cerrarModal(true)` | manual |
| R10 — foco visible tras confirmar | `cerrarModal(false)` + destinos por acción | manual |
| R11 — sin warning de `aria-hidden` | eliminación del atributo dinámico | consola |
| R12 — foco al cambiar de pantalla | `switchScreen()` | manual |
| R13 — foco sin scroll adicional | `focus({ preventScroll: true })` | manual |

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
| --- | --- | --- | --- |
| `index.html` | modificar | `hidden` inicial, `aria-labelledby`, `aria-describedby`, `tabindex="-1"` en las cuatro pantallas | R1, R2, R3, R12 |
| `css/styles.css` | modificar | Regla `[hidden]` que gane a `display:flex`, bloqueo de scroll y foco visible de pantalla | R1, R8, R12 |
| `js/app.js` | modificar | Abrir/cerrar modal, *trap*, `Escape`, `inert`, scroll, orden render/foco y destinos tras confirmar | R1–R13 |
| `js/engine.js` | modificar | `nextFocusIndex()` puro para el ciclo de foco | R5 |
| `tests/cu-07/foco-modal.test.js` | crear | Tests del ciclo de foco | R5 |
| `AGENTS.md` | modificar | Añadir CU-07 a la lista de casos y `tests/cu-07/` a la estructura | R5 |
| `MEMORY.md` | modificar | Evidencia manual y decisiones de foco | R1–R13 |

No se añaden dependencias ni se usa `inert` como polyfill externo.

## 3. Funciones puras necesarias

| Función | Entrada → salida | Responsabilidad | RF |
| --- | --- | --- | --- |
| `nextFocusIndex` (nueva) | `(indiceActual, total, retroceder)` → entero | Calcula el siguiente índice con vuelta circular | R5 |

`nextFocusIndex` no toca el DOM: recibe el número de controles enfocables y devuelve el índice. El resto (leer `document.activeElement`, aplicar `focus()`, `inert`) es DOM y se verifica manualmente.

## 4. Algoritmo (pseudocódigo)

```text
FUNCIÓN abrirModal(titulo, mensaje, alConfirmar):
    disparador = document.activeElement
    rellenar #modal-title y #modal-msg con textContent
    #custom-modal.hidden = false
    aplicarInert(header, main, footer)        // si el navegador soporta inert
    body.classList.add("modal-open")
    registrar keydown en document
    enfocar #modal-confirm
    guardar disparador y alConfirmar

FUNCIÓN manejarTecla(evento):
    SI evento.key == "Escape":
        prevenir
        cerrarModal(restaurarFoco = verdadero)
        SALIR
    SI evento.key == "Tab":
        controles = [#modal-cancel, #modal-confirm]
        actual = índice del control enfocado
        destino = nextFocusIndex(actual, 2, evento.shiftKey)
        enfocar controles[destino]
        prevenir

FUNCIÓN cerrarModal(restaurarFoco):
    #custom-modal.hidden = true
    quitarInert(header, main, footer)
    body.classList.remove("modal-open")
    quitar keydown de document
    SI restaurarFoco Y disparador sigue visible:
        disparador.focus({ preventScroll: true })
    SINO SI restaurarFoco:
        enfocar pantalla activa
    // si no se restaura, la acción decide el destino (R10)

FUNCIÓN switchScreen(id):
    quitar .active de todas las pantallas
    activar #screen-id
    window.scrollTo(0, 0)
    #screen-id.focus({ preventScroll: true })
```

Orden de render y foco: `renderResults()`, `renderHistoryScreen()`, `renderLastAttempt()` y `startQuiz()` deben **pintar el contenido antes** de llamar a `switchScreen()`. Así el foco cae en una pantalla ya poblada y el lector no anuncia contenido obsoleto.

Destinos de foco tras confirmar (R10):

| Acción | Pantalla | Destino de foco |
| --- | --- | --- |
| Finalizar test | resultados | `#screen-results` |
| Descartar examen | portada | `#btn-start-quiz` |
| Borrar historial | portada | `#btn-clear-history` |
| Eliminar intento | historial | `#screen-history` (o su encabezado si queda vacío) |
| Confirmar descarte y empezar (003) | quiz | `#screen-quiz` |

## 5. Pintado en la interfaz

- El modal cerrado no ocupa espacio ni recibe foco: `hidden` + `.modal-overlay[hidden] { display: none; }`.
- Al abrirse: overlay visible, fondo inerte, scroll bloqueado y foco en «Aceptar».
- `Tab`/`Shift+Tab` ciclan solo entre «Cancelar» y «Aceptar».
- `Escape` cierra desde cualquier punto.
- Al cerrar con «Cancelar» o `Escape`, el foco vuelve al disparador.
- Al confirmar, el foco pasa a un elemento visible de la pantalla destino, nunca al modal oculto.
- Las pantallas tienen `tabindex="-1"` y un indicador de foco discreto; el foco programático no provoca scroll adicional.
- No se usa `aria-hidden` dinámico: el modal cerrado se oculta con `hidden` y el fondo con `inert`.

## 6. Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| Ocultar con `hidden` y añadir `.modal-overlay[hidden] { display:none }` | `.modal-overlay` tiene `display:flex`, que gana al `[hidden]` del user-agent; sin la regla, `hidden` no oculta | Solo `hidden` sin CSS: no funciona por especificidad; solo `opacity`: deja botones tabulables (bug actual) |
| Eliminar `aria-hidden` y usar `inert` en el fondo | Evita el warning «Blocked aria-hidden» y el foco en el fondo | `aria-hidden` dinámico: puede ocultar un elemento con foco y sigue el warning |
| `inert` con detección de soporte y *trap* como respaldo | Cubre navegadores actuales y mantiene el teclado dentro si `inert` no existe | Polyfill externo: prohibido por P.1; solo `aria-hidden`: R2 |
| `Escape` se escucha en `document` mientras el modal está abierto | Funciona aunque el foco se haya escapado | Escuchar solo en el modal: el bug actual (Escape solo si el foco está dentro) |
| Foco inicial en «Aceptar» | Cumple R4; es la acción principal del diálogo | Foco en «Cancelar»: más seguro para acciones destructivas, pero incumple R4 |
| `nextFocusIndex()` puro | Permite probar el ciclo sin DOM | Calcular el índice con condicionales inline: sin cobertura |
| Renderizar antes de `switchScreen()` | El foco se mueve a contenido ya pintado | Enfocar antes de renderizar: el lector anuncia la pantalla anterior/vacía |
| Bloquear scroll con una clase en `body` y restaurar el valor previo | Evita el desplazamiento del fondo y conserva la posición | `position:fixed` en `body`: salto de scroll y pérdida de posición |
| Foco con `preventScroll` | Evita un segundo desplazamiento tras `scrollTo(0,0)` | `focus()` sin opciones: puede desplazar la página |

## 7. Estrategia de tests (`node --test`)

| Archivo | Caso | RF |
| --- | --- | --- |
| `tests/cu-07/foco-modal.test.js` | Desde el índice 0, avanzar → 1; desde 1, avanzar → 0 | R5 |
| `tests/cu-07/foco-modal.test.js` | Desde 0, retroceder → 1; desde 1, retroceder → 0 | R5 |
| `tests/cu-07/foco-modal.test.js` | Un solo control: avanzar y retroceder devuelven 0 | R5 |
| `tests/cu-07/foco-modal.test.js` | `total = 0` devuelve 0 sin lanzar | R5 |
| `tests/cu-07/foco-modal.test.js` | Índice actual fuera de rango se normaliza al primero | R5 |

El resto de RF son DOM/teclado y se verifican manualmente; no se instala un arnés DOM (P.4).

## 8. Verificación manual y evidencia

1. Portada: tabular hasta «Borrar historial»; el siguiente `Tab` no debe entrar en «Cancelar»/«Aceptar».
2. Abrir el modal: el foco debe estar en «Aceptar»; el árbol de accesibilidad debe mostrar título y mensaje.
3. `Tab`: «Aceptar» → «Cancelar» → «Aceptar»; `Shift+Tab`: al revés.
4. `Escape`: cierra y devuelve el foco al disparador.
5. Finalizar un test y confirmar: foco en `#screen-results`; consola sin `Blocked aria-hidden`.
6. Eliminar un intento: foco en `#screen-history`; la lista se repinta.
7. Borrar historial: foco en `#btn-clear-history`; estado vacío visible.
8. Iniciar un test: foco en `#screen-quiz`; al terminar, en `#screen-results`.
9. Comprobar `inert` en el árbol de accesibilidad y que el fondo no recibe foco.
10. Repetir a 375 px; consola limpia; evidencia en `MEMORY.md`.

## 9. Conformidad con la constitución

- **P.1:** sin dependencias; `inert` es nativo y el respaldo es código propio.
- **P.2:** R1–R13 con criterio y verificación; los destinos de foco se concretan en este plan.
- **P.3:** `app.js` gestiona estado/render/eventos; `engine.js` solo aporta la función pura de índice; `index.html` estructura y `styles.css` presentación.
- **P.4:** verificación manual con flujo completo, consola, árbol de accesibilidad y 375 px; evidencia registrada.
- **P.5:** no hay borrados nuevos; se evita ocultar contenido con foco y se mantiene el foco en elementos visibles.
- **P.6:** textos y comentarios en español; identificadores en inglés.

## 10. Enmiendas o aclaraciones de spec

- **006 R10:** la lista «finalizar test, descartar, borrar historial» mezcla acciones que cambian de pantalla con otras que no. Se sustituye por la tabla de destinos de §4; la spec debe recogerla.
- **006 R4 vs. criterio de `Tab`:** el foco inicial es «Aceptar»; la secuencia manual correcta es «Aceptar → Cancelar → Aceptar». El criterio «Cancelar → Aceptar → Cancelar» presupone un foco inicial que R4 no define.
- **006 R1:** se concreta que `hidden` necesita la regla CSS por la especificidad de `.modal-overlay { display:flex }`.
- **006 R7/§7:** el fallback con `aria-hidden` queda descartado por R2; si no hay `inert`, se usa solo el *trap* y no se oculta el fondo con `aria-hidden`.
