# Tasks 009 — Mejoras medias

Convención: `- [ ]` pendiente, `- [x]` completada. Cada tarea es verificable por sí misma. Las dependencias se indican al final de cada bloque y en la sección final.

## Fase A — Lógica pura y tests (TDD)

- [ ] **T01** Escribir en `tests/cu-08/paginar.test.js` los casos de `paginate`: página completa, última página parcial, `page` fuera de rango (0, negativo, mayor que `totalPages`), `pageSize` inválido (0, negativo, no entero), lista vacía, entrada no array, y comprobación de que no muta la lista de origen. *(RF-12, RF-32, CA-07)*
- [ ] **T02** Añadir en `tests/cu-05/historial.test.js` los casos del límite: `getHistoryLength()` con historial vacío, con entradas y con crudo corrupto; `saveAttempt(attempt)` sin rotación conserva todas las entradas; `saveAttempt(attempt, { rotate: true })` elimina la más antigua al superar `HISTORY_LIMIT`; la rotación conserva las entradas inválidas del crudo. *(RF-01, RF-02, RF-33, CA-02)*
- [ ] **T03** Ejecutar `npm test` y comprobar que T01 y T02 fallan por exportaciones ausentes (rojo esperado).
- [ ] **T04** Implementar `HISTORY_PAGE_SIZE = 10` y `paginate(list, page, pageSize)` en `js/engine.js` siguiendo el pseudocódigo de `plan.md` §2.4. *(RF-12)*
- [ ] **T05** Implementar `HISTORY_LIMIT = 50`, `getHistoryLength()` y el parámetro `{ rotate }` de `saveAttempt` en `js/storage.js`. *(RF-01, RF-02)*
- [ ] **T06** Ejecutar `npm test` y verificar verde sin regresiones sobre los 109 tests existentes. *(RNF-03, CA-13)*
- [ ] **T07** Verificar que el test de `buildQuiz` con `count` inválido heredado de 008 existe en `tests/cu-01/iniciar-simulacro.test.js` y pasa. *(RF-31)*

**Dependencias:** T03 ← T01, T02 · T04 ← T01 · T05 ← T02 · T06 ← T04, T05 · T07 ← T06

## Fase B — Auditoría de contraste (2.4)

- [ ] **T08** Extraer de `css/styles.css` la lista de pares texto/fondo reales: los 21 usos de `--tinta-suave`, los textos sobre `--papel`, `--azul-papel`, `--azul-cielo`, los estados de corrección, los badges y los estados `disabled` de botón. *(RF-06)*
- [ ] **T09** Calcular los ratios WCAG 2.1 con un script Node temporal fuera del repositorio (no se añade ninguna dependencia ni archivo al proyecto). *(RF-06, RNF-01)*
- [ ] **T10** Clasificar cada par por tamaño de texto (normal: umbral 4.5:1; grande ≥ 18.66 px o ≥ 14 px en negrita: umbral 3:1) e identificar incumplimientos. *(RF-06, RF-07)*
- [ ] **T11** Si hay incumplimientos: corregir únicamente la variable CSS afectada en `:root`, sin añadir colores literales; si no los hay, no modificar `styles.css`. *(RF-07, RF-08)*
- [ ] **T12** Registrar la tabla de ratios medidos y la conclusión (con la corrección de la cifra 4.4:1 del informe) en la sección «Aprendizajes y trampas» de `MEMORY.md`. *(RF-06, RF-08, CA-03)*
- [ ] **T13** Comprobar visualmente en Chrome DevTools que ningún texto ha perdido legibilidad tras los ajustes. *(CA-03)*

**Dependencias:** T09 ← T08 · T10 ← T09 · T11 ← T10 · T12 ← T10 · T13 ← T11

## Fase C — Cambios de comportamiento

- [ ] **T14** Añadir el parámetro opcional `onCancel` a `showModal(title, msg, onConfirm, onCancel = null)` y consumirlo/limpiarlo en `closeModal`, verificando que los cinco puntos de llamada actuales siguen funcionando sin cambios. *(plan §2.6, RF-04)*
- [ ] **T15** Definir las constantes de texto `HISTORY_FULL_TITLE`, `HISTORY_FULL_MESSAGE` y `NOT_SAVED_MESSAGE` en español. *(RF-03, RF-04)*
- [ ] **T16** Implementar `describeOldestAttempt()` (usa `formatDate` y `formatPct` sobre la última entrada representable del historial) y la confirmación de historial completo en `finishQuiz()`, con guardado rotativo solo tras confirmar. *(RF-03, RF-05, CA-01)*
- [ ] **T17** Implementar la ruta de cancelación: mostrar el resultado sin escribir en `localStorage` y avisar con `NOT_SAVED_MESSAGE`. *(RF-04, CA-01)*
- [ ] **T18** Verificar en Chrome DevTools el flujo de historial completo sembrando 50 intentos: confirmar rota y guarda; cancelar no escribe nada. Comprobar que ninguna otra ruta borra sin confirmación. *(CA-01, CA-02, RF-05)*
- [ ] **T19** En `renderQuestion()`, ocultar `#btn-finish-quiz` con `hidden` en la última pregunta y mover el foco a `#btn-next-q` si lo tenía; comprobar que reaparece al retroceder. *(RF-09, RF-10, RF-11, CA-04)*
- [ ] **T20** Reescribir `renderHistoryScreen()` con paginación: `historyPage` local, `paginate(history, historyPage, HISTORY_PAGE_SIZE)`, lista y pie (`history-count` con `aria-live="polite"` y `#btn-load-more-history` con el recuento de restantes). *(RF-13, RF-14, RF-15, CA-05)*
- [ ] **T21** Implementar `loadMoreHistory()` que añade las tarjetas de la siguiente página sin re-pintar las anteriores y actualiza el pie; ocultar el botón cuando `hasMore` es `false`. *(RF-13, RF-14, CA-05)*
- [ ] **T22** Sustituir los listeners por tarjeta de «Ver»/«Eliminar» por delegación de eventos sobre el contenedor con `closest('.btn-view')` / `closest('.btn-del')`, y reiniciar `historyPage` tras eliminar. *(RF-16, CA-06)*
- [ ] **T23** Añadir el botón `#btn-print-results` («Imprimir») en `.actions-row` de `#screen-results` y su listener con `window.print()`. *(RF-17)*
- [ ] **T24** Añadir el bloque `@media print` en `css/styles.css` (oculta cabecero, pie, barras, botones, banner y modal; ajusta `main`, `.screen` y `break-inside` de `.review-item`; refuerza `.status-badge` con borde). *(RF-18, RF-19, RF-20, CA-08)*
- [ ] **T25** Añadir los estilos del pie de historial (`.history-count`, `#btn-load-more-history`) usando las variables CSS existentes. *(RNF-04, convención de `AGENTS.md`)*
- [ ] **T26** Verificación manual intermedia en Chrome DevTools: finalización en la última pregunta, historial paginado con 25 intentos, acciones en la tercera página, previsualización de impresión en color y en escala de grises, consola limpia y 375 px. *(CA-04, CA-05, CA-06, CA-08)*
- [ ] **T27** Ejecutar `npm test` y confirmar que sigue en verde tras los cambios de comportamiento. *(RNF-03)*

**Dependencias:** T15 ← T14 · T16 ← T05, T14, T15 · T17 ← T14, T16 · T18 ← T16, T17 · T19 ← (independiente) · T20 ← T04 · T21 ← T20 · T22 ← T20 · T24 ← T23 · T26 ← T18, T19, T21, T22, T24 · T27 ← T26

## Fase D — Refactor de módulos (6.1–6.3)

- [ ] **T28** Crear `js/dom.js` con `SCREENS`, `IDS`, `BACKGROUND_REGIONS`, `OPTION_PREFIXES`, `optionPrefix(index)` y `byId(id)`; sin dependencias. *(RF-23, RF-27)*
- [ ] **T29** Crear `js/state.js` con el objeto `state` exportado; sustituir la declaración local de `app.js` por el import. *(RF-22)*
- [ ] **T30** Extraer a `js/ui/modal.js`: `supportsInert`, `modalTrigger`, `modalConfirmHandler`, `applyBackgroundInert`, `focusActiveScreen`, `isVisible`, `switchScreen`, `modalKeydownHandler`, `closeModal`, `showModal`, `showStorageError`. Verificar el flujo completo del modal antes de continuar. *(RF-24, RF-27)*
- [ ] **T31** Extraer a `js/ui/render.js`: `renderQuestion`, `renderResults`, `renderLastAttempt`, `renderHistoryScreen`, `returnHome` y `historyPage`. Comprobar que no importa `flow/quiz.js` (grafo acíclico). *(RF-25, RF-27)*
- [ ] **T32** Extraer a `js/flow/quiz.js`: `startTimer`, `stopTimer`, `saveActiveQuizNow`, `persistActiveQuiz`, `navigate`, `confirmDiscardActiveQuiz`, `handleStartQuiz`, `startQuiz`, `finishQuiz`. *(RF-26, RF-27)*
- [ ] **T33** Reducir `js/app.js` a `DOMContentLoaded`: carga y saneado del alias, banner de recuperación, datos del banco y registro de listeners; comprobar que queda por debajo de 200 líneas. *(RF-21, RF-28, CA-09)*
- [ ] **T34** Sustituir todos los literales de pantalla (`'home'`, `'quiz'`, `'results'`, `'history'`) por `SCREENS.*` y los identificadores repetidos por `IDS.*`. *(RF-23, CA-11)*
- [ ] **T35** Eliminar los dos arrays `prefixes` locales y usar `optionPrefix(index)` desde `dom.js`. *(RF-23, CA-11)*
- [ ] **T36** Verificar la ausencia de ciclos de import (ningún módulo de `ui/` o `flow/` importa `app.js`) y que `index.html` sigue cargando un único `js/app.js`. *(RF-27, RF-28)*
- [ ] **T37** Verificación manual completa post-refactor en Chrome DevTools: iniciar → responder → navegar → finalizar → resultados → historial → recuperación tras recarga, con consola limpia y 375 px en las cuatro pantallas. *(RF-30, CA-10)*
- [ ] **T38** Ejecutar `npm test` y confirmar verde sin cambios en los tests (el refactor no toca la lógica pura). *(RNF-03, CA-13)*

**Dependencias:** T29 ← T28 · T30 ← T28, T29 · T31 ← T28, T29, T30 · T32 ← T28, T29, T30, T31 · T33 ← T32 · T34 ← T33 · T35 ← T28, T31 · T36 ← T33 · T37 ← T33, T34, T35 · T38 ← T37

## Fase E — Documentación y cierre

- [ ] **T39** Añadir JSDoc (`@param`, `@returns`, descripción en español) a todas las funciones públicas exportadas de `js/engine.js`. *(RF-29, CA-12)*
- [ ] **T40** Añadir JSDoc a los métodos públicos de `Storage` y a las constantes exportadas de `js/storage.js`. *(RF-29, CA-12)*
- [ ] **T41** Actualizar `AGENTS.md`: nueva estructura de `js/` (state, dom, ui/, flow/), convención de `SCREENS`/`IDS`/`OPTION_PREFIXES`, límite de historial con confirmación y paginación. *(RNF-07, CA-14)*
- [ ] **T42** Actualizar `MEMORY.md`: entrada fechada con las decisiones (límite 50 con rotación confirmada, paginación incremental, delegación de eventos, división modular, `onCancel` del modal, ubicación de `switchScreen`), la tabla de contraste y la línea de bitácora. *(RNF-07, CA-03, CA-14)*
- [ ] **T43** Ejecutar `npm test` por última vez y registrar el número de tests en `MEMORY.md`. *(CA-13)*
- [ ] **T44** Repasar el checklist de `AGENTS.md` (7 puntos) y marcar las tareas de este archivo como completadas. *(CA-14)*

**Dependencias:** T40 ← T39 · T41 ← T33, T37 · T42 ← T12, T37, T41 · T43 ← T42 · T44 ← T43

## Resumen de dependencias entre fases

A → C (T16 y T20 necesitan `paginate` y el límite de historial) · B es independiente y puede hacerse en paralelo con A · D → después de C (el refactor se aplica sobre el comportamiento ya estable) · E → después de D.
