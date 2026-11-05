# Tasks 008 — Mejoras rápidas de robustez, accesibilidad y UX

## Fase 1 — Lógica pura

- [ ] T01 Modificar `buildQuiz` en `js/engine.js` para validar `count` (RF-01).
- [ ] T02 Modificar `scoreQuiz` en `js/engine.js` para devolver ceros con banco vacío (RF-10).
- [ ] T03 Añadir tests en `tests/cu-01/iniciar-simulacro.test.js` para `buildQuiz` con `count` inválido (CA-01).
- [ ] T04 Añadir tests en `tests/cu-04/finalizar.test.js` para `scoreQuiz([], {})` (CA-10).
- [ ] T05 Ejecutar `npm test` y verificar que sigue en verde (107 + nuevos).

## Fase 2 — HTML y CSS

- [ ] T06 Añadir `aria-live="polite"` y `aria-atomic="true"` a `#question-statement` en `index.html` (RF-03, CA-03).
- [ ] T07 Añadir `autocorrect="off"` al `<input id="input-alias">` en `index.html` (RF-07, CA-07).
- [ ] T08 Añadir la etiqueta `<meta http-equiv="Content-Security-Policy">` en `<head>` de `index.html` (RF-11, CA-11).
- [ ] T09 Añadir la regla `@media (prefers-reduced-motion: reduce)` en `css/styles.css` (RF-04, CA-04).

## Fase 3 — JavaScript de interfaz

- [ ] T10 Importar `pluralize` en `js/app.js` (RF-08).
- [ ] T11 Sustituir la construcción manual del plural en `finishQuiz` por `pluralize` (RF-08, CA-08).
- [ ] T12 En `renderQuestion`, añadir manejador `keydown` para `ArrowDown`/`ArrowRight`/`ArrowUp`/`ArrowLeft`/`Home`/`End` (RF-02, CA-02).
- [ ] T13 En el manejador `click` de la opción, pasar `idx` a `renderQuestion(idx)` (RF-05, CA-05).
- [ ] T14 Registrar el listener `beforeunload` en `DOMContentLoaded` (RF-06, CA-06).
- [ ] T15 Cambiar `e.target.dataset.id` por `e.currentTarget.dataset.id` en los manejadores de `.btn-view` y `.btn-del` (RF-09, CA-09).

## Fase 4 — Verificación

- [ ] T16 Ejecutar `npm test` (CA: verde).
- [ ] T17 Servir por HTTP y verificar en Chrome DevTools: flujo completo, consola limpia, teclado, foco, beforeunload, alias en móvil.
- [ ] T18 Verificar vista a 375 px sin desbordamiento y sin violaciones de CSP en consola.
- [ ] T19 Actualizar `MEMORY.md` (bitácora y estado) con el cierre del spec 008.
- [ ] T20 Marcar las tareas completadas en este archivo.

## Dependencias

- T02 depende de T01 (ambas en `engine.js`, mismo bloque).
- T11 depende de T10.
- T12 y T13 se editan en la misma función (`renderQuestion`): aplicar en el mismo commit para evitar conflictos.
- T16 depende de T01–T15.
- T17 y T18 dependen de T16.
- T19 y T20 dependen de T17 y T18.
