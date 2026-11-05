# Tasks 002 — Refrescar «Último resultado» al configurar otro test

- **Spec:** `specs/002-refrescar-ultimo-resultado/spec.md`
- **Plan:** `specs/002-refrescar-ultimo-resultado/plan.md`
- **Estado:** completado (2026-11-05)
- **Fecha:** 2026-11-03
- **Dependencias externas:** 006 (R12: renderizar antes de `switchScreen()`). Las tareas pueden implementarse antes, pero la verificación de foco se cierra con 006.

> Convención: una tarea se marca `[x]` únicamente cuando se cumple su línea **Hecho cuando**. Cada tarea está pensada para 20–30 minutos.

## Cobertura RF

| RF | Tareas |
| --- | --- |
| R1 — «Configurar otro test» refresca la tarjeta | T01, T02 |
| R2 — muestra el último intento (`history[0]`) | T01, T04 |
| R3 — no duplica ni modifica el historial | T02, T04 |
| R4 — estado vacío sin historial | T04, T05 |
| R5 — las tres salidas coinciden | T01, T03, T05 |

## Tareas

- [x] **T01 — Crear `volverAlInicio()` con render antes del cambio de pantalla**
  - **RF:** R1, R2, R5
  - **Depende de:** —
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** la función ejecuta `renderLastAttempt()` antes de `switchScreen('home')`; tras terminar un test y llamarla, la tarjeta muestra la nota del intento recién guardado.

- [x] **T02 — Enlazar «Configurar otro test» a `volverAlInicio()`**
  - **RF:** R1, R3
  - **Depende de:** T01
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** `#btn-restart-from-res` ya no ejecuta solo `switchScreen('home')`; tras pulsarlo, la tarjeta se actualiza y `Storage.getHistory().length` no cambia.

- [x] **T03 — Enlazar «Volver al inicio» y «Volver» del historial a la misma ruta**
  - **RF:** R5
  - **Depende de:** T01
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** `#btn-home-from-res` y el botón «Volver» de `#screen-history` llaman a `volverAlInicio()`; las tres salidas producen la misma tarjeta y el mismo orden render → pantalla.

- [x] **T04 — Verificar la semántica `history[0]` y que no hay escrituras**
  - **RF:** R2, R3, R4
  - **Depende de:** T02, T03
  - **Archivos:** `tests/cu-05/historial.test.js`, `js/app.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** el test existente de «el intento más reciente queda primero» sigue en verde; `volverAlInicio()` no llama a ningún método de escritura de `Storage`; con dos intentos, revisar el antiguo y volver muestra el último (`history[0]`), no el revisado.

- [x] **T05 — Verificar los estados vacíos y registrar evidencia**
  - **RF:** R4, R5
  - **Depende de:** T04
  - **Archivos:** `MEMORY.md`
  - **Estimación:** 25 min
  - **Hecho cuando:** sin historial, las tres rutas muestran el estado vacío; el checklist del plan §8 se ejecuta con consola limpia y 375 px; la evidencia queda en `MEMORY.md`.

## Cierre de la implementación (2026-11-05)

- **Estado:** completado. Primero se añadió el test de historial de solo lectura; después se implementó la función.
- **Tests:** `node --test` → **44/44 en verde** (nuevo caso «consultar el historial no lo modifica» en CU-05).
- **Implementación:** `returnHome()` ejecuta `renderLastAttempt()` antes de `switchScreen('home')`; las tres salidas (`btn-restart-from-res`, `btn-home-from-res` y `btn-back-home-history`) usan esa misma ruta. Se usa un identificador en inglés conforme a la constitución P.6; el plan lo denomina `volverAlInicio()`.
- **Primera salida:** un intento de 0 % y otro de 100 %; «Configurar otro test», «Volver al inicio» y «Volver» del historial mostraron siempre la tarjeta del último intento (`history[0]`), con el historial intacto en 2 entradas.
- **Revisión de un antiguo:** al abrir el intento de 0 % desde el historial y volver, la portada mostró el 100 % del último intento, no el revisado.
- **Estado vacío:** tras borrar el historial, las tres rutas mostraron el mensaje «Todavía no has completado ningún simulacro».
- **Consola:** sin mensajes de error, aviso ni aserción.
- **Vista móvil:** 375 px reales vía CDP (`innerWidth: 375`, `scrollWidth: 375`, media query móvil activa), sin desbordamiento horizontal.
