# Tasks 004 — Robustez de los datos persistidos

- **Spec:** `specs/004-robustez-datos-persistidos/spec.md`
- **Plan:** `specs/004-robustez-datos-persistidos/plan.md`
- **Estado:** completado (2026-11-05)
- **Fecha:** 2026-11-03
- **Dependencias externas:** ninguna. Es la base de 001, 003 y 005.

> Convención: una tarea se marca `[x]` únicamente cuando se cumple su línea **Hecho cuando**. Cada tarea está pensada para 20–30 minutos.

## Cobertura RF

| RF | Tareas |
| --- | --- |
| R1 — `getHistory` seguro | T07, T14 |
| R2 — `getActiveQuiz` seguro | T01, T02, T09 |
| R3 — escrituras sin excepciones | T05, T06, T08, T10, T13, T14 |
| R4 — descartar respuestas ajenas y normalizar | T01, T02 |
| R5 — escapar/convertir datos del historial | T03, T04, T11, T12, T14 |
| R6 — arranque con datos corruptos | T06, T09, T14 |
| R7 — no borrar automáticamente | T07, T08 |

## Tareas

- [x] **T01 — Validadores base en `engine.js`**
  - **RF:** R2, R4
  - **Depende de:** —
  - **Archivos:** `js/engine.js`, `tests/cu-03/recuperar.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** existen `isPlainObject`, `isNonEmptyString` e `isValidQuestion`; los tests cubren `null`, arrays, `id` vacío, `options` no array o vacío, ids duplicados y `correctOption` inexistente; `node --test tests/cu-03` en verde.

- [x] **T02 — Implementar `sanitizeAnswers()` y `normalizeActiveQuiz()`**
  - **RF:** R2, R4
  - **Depende de:** T01
  - **Archivos:** `js/engine.js`, `tests/cu-03/recuperar.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** las formas inválidas devuelven `null`; `currentIndex: 999` se recorta al último válido; `accumulatedMs: -5` o `NaN` pasa a `0`; las respuestas con id ajeno, valor vacío u opción inexistente se descartan y las válidas se conservan; tests en verde.

- [x] **T03 — Implementar `normalizeAttempt()` y `normalizeHistory()`**
  - **RF:** R1, R5
  - **Depende de:** T01
  - **Archivos:** `js/engine.js`, `tests/cu-05/historial.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** se filtran las entradas no representables sin lanzar; las métricas se recalculan desde los snapshots con `scoreQuiz`; `date`, `totalTimeSeconds` y `candidateAlias` se normalizan; un `scorePct` string o una fecha inválida no rompen; tests en verde.

- [x] **T04 — Añadir guardias a `formatDate`, `formatPct` y `formatTime`**
  - **RF:** R5
  - **Depende de:** —
  - **Archivos:** `js/engine.js`, `tests/cu-04/finalizar.test.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** una fecha ISO inválida devuelve `—`, un porcentaje no finito devuelve `—` y un tiempo no finito o negativo devuelve `00:00`; los tests existentes de formateadores siguen en verde.

- [x] **T05 — Crear el `localStorage` de pruebas con fallos inyectables**
  - **RF:** R3
  - **Depende de:** —
  - **Archivos:** `tests/helpers/failing-storage.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** el helper permite `failOnGet` y `failOnSet`, se puede asignar a `globalThis.localStorage`, lanza solo en la operación configurada y se restaura el valor original tras cada test.

- [x] **T06 — Implementar `readJSON()` y `writeJSON()` con aviso único**
  - **RF:** R3, R6
  - **Depende de:** T05
  - **Archivos:** `js/storage.js`, `tests/cu-04/finalizar.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** un JSON corrupto devuelve el valor por defecto sin lanzar; un `setItem` que lanza devuelve `false`; el aviso se emite una sola vez por clave y sesión; un test con `failing-storage` lo demuestra.

- [x] **T07 — Implementar `getHistory()` y `readRawHistory()`**
  - **RF:** R1, R7
  - **Depende de:** T03, T06
  - **Archivos:** `js/storage.js`, `tests/cu-05/historial.test.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** `getHistory()` devuelve `[]` con `null`, `{}`, `"texto"` o número; `readRawHistory()` devuelve el array crudo sin filtrar; ninguna de las dos escribe en `localStorage`.

- [x] **T08 — Endurecer `saveAttempt`, `deleteAttempt` y `clearHistory`**
  - **RF:** R3, R7
  - **Depende de:** T07
  - **Archivos:** `js/storage.js`, `tests/cu-04/finalizar.test.js`, `tests/cu-05/historial.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** las tres devuelven booleano; un fallo de escritura devuelve `false` sin propagar; guardar o borrar sobre `[null, intentoVálido]` conserva la entrada `null` en el crudo y solo muestra la válida; tests en verde.

- [x] **T09 — Implementar `getActiveQuiz()` con validación**
  - **RF:** R2, R6
  - **Depende de:** T02, T06
  - **Archivos:** `js/storage.js`, `tests/cu-03/recuperar.test.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** `{`, `null`, texto plano, `{}`, `questions: []`, `userAnswers` no objeto y `currentIndex` no entero devuelven `null`; un snapshot válido hace round-trip; el aviso de forma inválida se emite una vez por clave y sesión.

- [x] **T10 — Endurecer `setAlias`, `setActiveQuiz` y `clearActiveQuiz`**
  - **RF:** R3
  - **Depende de:** T06
  - **Archivos:** `js/storage.js`, `tests/cu-06/alias.test.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** con `getItem` o `setItem` lanzando, ninguna propaga la excepción y las escrituras devuelven `false`; el alias y el examen en curso no dejan la app en estado inconsistente.

- [x] **T11 — Escapar y convertir los datos en `renderLastAttempt()` y `renderHistoryScreen()`**
  - **RF:** R5
  - **Depende de:** T03
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** `candidateAlias`, `id`, `date`, `totalQuestions`, `hits`, `errors`, `unanswered`, `scorePct` y `totalTimeSeconds` se insertan escapados o con `Number(...)`; `data-id` usa el id escapado; un alias con `<img src=x onerror=...>` se pinta como texto.

- [x] **T12 — Revisar el escapado de `renderResults()`**
  - **RF:** R5
  - **Depende de:** T04
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** enunciados, opciones y explicaciones siguen pasando por `escapeHTML()`; los campos numéricos del resumen usan `textContent` o conversión numérica; no queda ninguna interpolación directa de datos persistidos en `innerHTML`.

- [x] **T13 — Avisar en la interfaz cuando falla una escritura o un borrado**
  - **RF:** R3
  - **Depende de:** T08, T10
  - **Archivos:** `js/app.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** si `saveAttempt`, `deleteAttempt` o `clearHistory` devuelven `false`, se muestra el modal de aviso (componente de 006), la UI no presenta la operación como realizada y la consola no muestra una excepción.

- [x] **T14 — Verificación de arranque robusto y evidencia**
  - **RF:** R1, R3, R5, R6, R7
  - **Depende de:** T09, T11, T12, T13
  - **Archivos:** `MEMORY.md`
  - **Estimación:** 30 min
  - **Hecho cuando:** con `scs_active = "{"` y `scs_history = "null"` la app carga, muestra el estado vacío, registra listeners y permite completar un test; el checklist del plan §8 se ejecuta con consola controlada y 375 px; `npm test` en verde y evidencia en `MEMORY.md`.

## Cierre de la implementación (2026-11-05)

- **Estado:** completado. Primero se escribieron los tests de validación, normalización y fallos de almacenamiento; después se implementó el código.
- **Tests:** `node --test` → **76/76 en verde** (47 previos + 29 nuevos en CU-03, CU-04, CU-05 y CU-06).
- **Implementación:** `engine.js` añade validadores y normalizadores puros (`isPlainObject`, `isNonEmptyString`, `isValidQuestion`, `isValidActiveQuizShape`, `sanitizeAnswers`, `normalizeActiveQuiz`, `normalizeAttempt`, `normalizeHistory`) y guardias en los formateadores. `storage.js` centraliza lectura/escritura defensiva (`readJSON`, `writeJSON`, `removeKey`), avisa una vez por clave y sesión y conserva el historial crudo al guardar o borrar. `app.js` escapa/convierte los campos del historial y avisa con el modal si falla un guardado o un borrado.
- **Arranque con `scs_active = "{"`:** la app carga en la portada, no muestra banner, registra listeners e inicia un test de 25 preguntas.
- **Arranque con `scs_history = "null"`:** muestra el estado vacío; un test completado se guarda y aparece en el historial.
- **Índice fuera de rango:** `scs_active` con `currentIndex: 999` abre la última pregunta válida (5 de 5) sin romper.
- **Respuesta a id inexistente:** el banner informa de «0 respondidas» y la corrección final cuenta 5 en blanco, 0 aciertos y 0 errores.
- **Historial con HTML:** `<img src=x onerror=alert(1)>` en `candidateAlias` e `id` se pinta como texto; no se crea ningún `img` y el `data-id` queda escapado como atributo.
- **Fallos de almacenamiento forzados:** guardar muestra «No se pudo guardar» sin añadir el intento; borrar el historial y eliminar un intento muestran «No se pudo borrar» y conservan los datos.
- **Consola:** solo un aviso controlado (`[Storage] scs_history: escritura fallida`), sin excepciones.
- **Vista móvil:** 375 px reales vía CDP (`innerWidth: 375`, `scrollWidth: 375`); las cuatro pantallas miden 343 px de ancho útil, sin desbordamiento horizontal.
