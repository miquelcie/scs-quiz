# Tasks 001 — Persistir la navegación del examen

- **Spec:** `specs/001-persistir-navegacion/spec.md`
- **Plan:** `specs/001-persistir-navegacion/plan.md`
- **Estado:** completado
- **Fecha:** 2026-11-03
- **Dependencias externas:** 004 (normalización al recuperar). 006 solo afecta al orden render/foco, no bloquea estas tareas.

> Convención: una tarea se marca `[x]` únicamente cuando se cumple su línea **Hecho cuando**. Cada tarea está pensada para 20–30 minutos.

## Cobertura RF

| RF | Tareas |
| --- | --- |
| R1 — persistir al cambiar de índice | T01, T04 |
| R2 — persistir al ocultar/cerrar | T03, T05 |
| R3 — no persistir sin examen activo | T02, T03 |
| R4 — snapshot completo sin duplicar tiempo | T03, T06 |
| R5 — índice fuera de rango según 004 | T06, T07 |

## Tareas

- [x] **T01 — Añadir `moveIndex()` puro a `engine.js`**
  - **RF:** R1
  - **Depende de:** —
  - **Archivos:** `js/engine.js`, `tests/cu-02/responder.test.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** `moveIndex(0,5,1) === 1`, `moveIndex(4,5,1) === 4`, `moveIndex(0,5,-1) === 0` y `moveIndex(2,0,1) === 0`; `node --test tests/cu-02` en verde.

- [x] **T02 — Añadir `isQuizInProgress()` puro a `engine.js`**
  - **RF:** R3
  - **Depende de:** —
  - **Archivos:** `js/engine.js`, `tests/cu-02/responder.test.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** devuelve `false` con array vacío, índice negativo, índice igual a `length` e índice no entero; devuelve `true` con índice válido; tests en verde.

- [x] **T03 — Implementar `persistirSiProcede()` con guarda de pantalla y tiempo absoluto**
  - **RF:** R2, R3, R4
  - **Depende de:** T02
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** la función solo escribe si la pantalla activa es `quiz` y `isQuizInProgress()` es verdadero; guarda `accumulatedMs + (Date.now() - startTimestamp)` sin mutar `state.accumulatedMs`; dos llamadas seguidas no duplican el tiempo almacenado (comprobado en DevTools con `localStorage.getItem('scs_active')`).

- [x] **T04 — Enganchar «Anterior» y «Siguiente» a `navegar()`**
  - **RF:** R1
  - **Depende de:** T01, T03
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** responder la pregunta 1, avanzar a la 3 y recargar deja `scs_active.currentIndex === 2`; retroceder a la 2 y recargar deja `currentIndex === 1`; «Siguiente» en la última pregunta sigue llamando a `finishQuiz()`.

- [x] **T05 — Registrar `visibilitychange` y `pagehide` una sola vez**
  - **RF:** R2
  - **Depende de:** T03
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** ocultar la pestaña o disparar `pagehide` en la pantalla `quiz` actualiza `scs_active` con el tiempo del tramo; hacerlo en la portada con un examen guardado no modifica `scs_active`; los listeners no se duplican tras varios renderizados.

- [x] **T06 — Cubrir el round-trip con índice distinto de 0**
  - **RF:** R4, R5
  - **Depende de:** T04
  - **Archivos:** `tests/cu-03/recuperar.test.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** un test guarda un snapshot con `currentIndex: 3` y `accumulatedMs: 65000`, y `getActiveQuiz()` devuelve exactamente esos valores; un `currentIndex: 999` se recupera recortado a la última pregunta (política de 004); tests en verde.

- [x] **T07 — Verificación manual integral y evidencia**
  - **RF:** R1, R2, R3, R4, R5
  - **Depende de:** T04, T05, T06
  - **Archivos:** `MEMORY.md`
  - **Estimación:** 30 min
  - **Hecho cuando:** se ejecuta el checklist del plan §8 (avanzar/retroceder, recarga, pestaña oculta, resultados y portada), la consola queda limpia, se comprueba a 375 px y la evidencia queda registrada en `MEMORY.md`.

## Cierre de la implementación (2026-11-04)

- **Estado:** completado. Los tests se escribieron antes que el código y fallaron inicialmente por las exportaciones ausentes.
- **Tests:** `node --test` → **43/43 en verde** (casos de aceptación de 001 en CU-02 y round-trip en CU-03).
- **Implementación:** `persistActiveQuiz()` conserva el nombre existente y ahora aplica la guarda de pantalla + `isQuizInProgress()`; `saveActiveQuizNow()` realiza la escritura inicial incondicional de `startQuiz()`; `navigate()` usa `moveIndex()`; `startQuiz(savedQuiz)` recorta el índice guardado con `moveIndex(..., 0)`.
- **Navegación:** responder la 1, avanzar a la 3 y recargar dejó `currentIndex: 2`, 1 respuesta guardada y el cronómetro en `00:02`; al continuar abrió la pregunta 3 y al retroceder la 1 conservó la opción marcada.
- **Retroceso:** volver a la pregunta 2, recargar y continuar abrió la pregunta 2 con `currentIndex: 1`.
- **Ciclo de vida:** `pagehide` añadió 2166 ms y `visibilitychange` con `document.hidden` añadió 1007 ms al tiempo persistido.
- **Finalización:** tras confirmar, la pantalla de resultados quedó activa, el historial guardó 1 intento y `scs_active` permaneció `null` incluso disparando `pagehide` y `visibilitychange`.
- **Portada:** con un examen guardado y el banner visible, ambos eventos dejaron `scs_active` idéntico.
- **Consola:** sin mensajes.
- **Vista móvil:** 375 px reales vía CDP (`innerWidth: 375`, `scrollWidth: 375`, `mobileMedia: true`), sin desbordamiento horizontal.
