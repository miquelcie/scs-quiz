# Tasks 003 — Proteger el examen en curso al empezar otro

- **Spec:** `specs/003-proteger-examen-en-curso/spec.md`
- **Plan:** `specs/003-proteger-examen-en-curso/plan.md`
- **Estado:** completado (2026-11-05)
- **Fecha:** 2026-11-03
- **Dependencias externas:** 004 (validez de `scs_active`) y 006 (modal accesible). El comportamiento R1–R7 puede implementarse con el modal actual; la accesibilidad se cierra en 006.

> Convención: una tarea se marca `[x]` únicamente cuando se cumple su línea **Hecho cuando**. Cada tarea está pensada para 20–30 minutos.

## Cobertura RF

| RF | Tareas |
| --- | --- |
| R1 — confirmar antes de descartar un examen válido | T02 |
| R2 — texto que explica el descarte | T01 |
| R3 — confirmar descarta y arranca | T03, T06 |
| R4 — cancelar/Escape no toca `scs_active` | T04 |
| R5 — «Continuar examen» no confirma | T05 |
| R6 — el guardado cambia entre carga y clic | T02 |
| R7 — examen inválido = inexistente | T02, T06 |

## Tareas

- [x] **T01 — Definir el copy normativo del modal**
  - **RF:** R2
  - **Depende de:** —
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** existe una constante con el texto exacto «Hay un examen en curso con respuestas guardadas. Si empiezas uno nuevo, se descartará y no podrás recuperarlo.» y el modal de T02 la usa como mensaje.

- [x] **T02 — Releer `scs_active` al pulsar «Comenzar simulacro»**
  - **RF:** R1, R6, R7
  - **Depende de:** T01
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** el handler llama a `Storage.getActiveQuiz()` en el momento del clic; si devuelve un snapshot válido abre el modal; si devuelve `null` (incluido JSON corrupto o forma inválida) llama directamente a `startQuiz()`; cambiar `scs_active` desde otra pestaña antes del clic cambia el resultado sin romper la app.

- [x] **T03 — Implementar `confirmarDescarte()`**
  - **RF:** R3
  - **Depende de:** T02
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** el callback de confirmación ejecuta `Storage.clearActiveQuiz()` y después `startQuiz()`; el test nuevo empieza en la pregunta 1 y `scs_active` contiene el cuestionario nuevo.

- [x] **T04 — Asegurar que cancelar y `Escape` no modifican nada**
  - **RF:** R4
  - **Depende de:** T02
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** cancelar o pulsar `Escape` cierra el modal, deja `localStorage.getItem('scs_active')` idéntico antes/después y mantiene el banner de recuperación visible.

- [x] **T05 — Mantener «Continuar examen» sin confirmación**
  - **RF:** R5
  - **Depende de:** T02
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** con un examen válido, pulsar «Continuar examen» no abre modal, llama a `startQuiz(activo)`, oculta el banner y restaura la pregunta y respuestas guardadas.

- [x] **T06 — Cubrir descarte, sustitución y lectura inválida con tests**
  - **RF:** R3, R7
  - **Depende de:** T03
  - **Archivos:** `tests/cu-03/recuperar.test.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** hay tests que comprueban que `clearActiveQuiz()` + `setActiveQuiz()` deja el nuevo examen y no el anterior, que tras `clearActiveQuiz()` la lectura es `null` y que un `scs_active` inválido se lee como `null`; `node --test tests/cu-03` en verde.

- [x] **T07 — Verificación manual integral y evidencia**
  - **RF:** R1, R2, R3, R4, R5, R6, R7
  - **Depende de:** T04, T05, T06
  - **Archivos:** `MEMORY.md`
  - **Estimación:** 30 min
  - **Hecho cuando:** se ejecuta el checklist del plan §8 (modal, cancelar, confirmar, continuar, `scs_active` corrupto y cambio entre pestañas), la consola queda limpia, se revisa a 375 px y la evidencia queda en `MEMORY.md`.

## Cierre de la implementación (2026-11-05)

- **Estado:** completado. Primero se añadieron los tests de sustitución y lectura inválida; después se implementó el flujo.
- **Tests:** `node --test` → **47/47 en verde** (3 casos nuevos en CU-03).
- **Implementación:** `DISCARD_ACTIVE_QUIZ_MESSAGE` contiene el copy exacto; `handleStartQuiz()` relee `scs_active` en el clic y abre el modal solo con un snapshot válido; `confirmDiscardActiveQuiz()` ejecuta `Storage.clearActiveQuiz()` y después `startQuiz()`. «Continuar examen» relee `scs_active`, no muestra modal y reanuda; si ya no existe, inicia uno nuevo.
- **Desviación del plan:** se añadió una lectura defensiva mínima (`readActiveQuiz()`) en `js/storage.js` para que un `scs_active` corrupto o con forma inválida se lea como `null` (R7/T06). La normalización completa de datos persistidos sigue reservada al plan 004.
- **Modal:** al pulsar «Comenzar simulacro» con un examen válido aparecen el título «Examen en curso» y el mensaje normativo, y `scs_active` no cambia.
- **Cancelar y `Escape`:** cierran el modal, dejan `scs_active` idéntico y mantienen visible el banner de recuperación.
- **Confirmar:** el test nuevo empieza en la pregunta 1, con 0 respuestas y un cuestionario distinto; `scs_active` contiene el nuevo snapshot y el banner queda oculto.
- **Continuar:** con un examen válido no aparece modal, se restaura la pregunta 2 y las 2 respuestas guardadas, y el banner se oculta.
- **`scs_active` corrupto:** con el valor `{` y la portada cargada, «Comenzar simulacro» no abre modal e inicia un test nuevo válido.
- **Cambio entre carga y clic:** añadir un examen válido tras la carga hace que el clic abra el modal; eliminarlo tras la carga hace que inicie un test sin modal. En ambos casos la app no se rompe.
- **Consola:** sin mensajes de error, aviso ni aserción.
- **Vista móvil:** 375 px reales vía CDP (`innerWidth: 375`, `scrollWidth: 375`), modal dentro del viewport, sin desbordamiento horizontal.
