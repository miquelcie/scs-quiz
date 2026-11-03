# Tasks 005 — Textos y recuento del banner de recuperación

- **Spec:** `specs/005-textos-recuperacion/spec.md`
- **Plan:** `specs/005-textos-recuperacion/plan.md`
- **Estado:** pendiente
- **Fecha:** 2026-11-03
- **Dependencias externas:** 004 (snapshot y respuestas saneadas). Sin 004, la función debe seguir siendo defensiva.

> Convención: una tarea se marca `[x]` únicamente cuando se cumple su línea **Hecho cuando**. Cada tarea está pensada para 20–30 minutos.

## Cobertura RF

| RF | Tareas |
| --- | --- |
| R1 — `countAnswered` puro | T02 |
| R2 — `formatRecoveryInfo` puro | T03 |
| R3 — textos 0 / 1 / 2+ y plural de `N` | T01, T03, T05 |
| R4 — `app.js` usa la función | T04, T05 |
| R5 — ignorar ids ajenos y valores inválidos | T02 |

## Tareas

- [ ] **T01 — Añadir `pluralize()` interna a `engine.js`**
  - **RF:** R3
  - **Depende de:** —
  - **Archivos:** `js/engine.js`, `tests/cu-03/recuperar.test.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** `pluralize(1,'pregunta','preguntas') === '1 pregunta'`, `pluralize(2,'pregunta','preguntas') === '2 preguntas'` y `pluralize(1,'respondida','respondidas') === '1 respondida'`; tests en verde.

- [ ] **T02 — Implementar `countAnswered()`**
  - **RF:** R1, R5
  - **Depende de:** T01
  - **Archivos:** `js/engine.js`, `tests/cu-03/recuperar.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** cuenta solo respuestas que son string no vacío y pertenecen a las opciones de su pregunta; ignora ids ajenos, opciones inexistentes, `""`, `null`, `undefined` y números; `answers` nulo o array devuelve `0` sin lanzar; tests en verde.

- [ ] **T03 — Implementar `formatRecoveryInfo()`**
  - **RF:** R2, R3
  - **Depende de:** T02
  - **Archivos:** `js/engine.js`, `tests/cu-03/recuperar.test.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** produce exactamente los textos de 0, 1 y 2+ respuestas; con `N = 1` escribe «1 pregunta»; sin preguntas devuelve `""`; con argumentos de cualquier tipo nunca lanza; tests en verde.

- [ ] **T04 — Integrar `formatRecoveryInfo()` en el banner**
  - **RF:** R4
  - **Depende de:** T03
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** `#recovery-info` recibe el resultado de `formatRecoveryInfo(activeQuiz.questions, activeQuiz.userAnswers)` mediante `textContent`; ya no queda el texto construido a mano; el banner solo se muestra con un snapshot válido.

- [ ] **T05 — Verificación manual de los textos y evidencia**
  - **RF:** R3, R4
  - **Depende de:** T04
  - **Archivos:** `MEMORY.md`
  - **Estimación:** 25 min
  - **Hecho cuando:** se comprueban 0, 1 y 2 respuestas tras recargar; un test de una sola pregunta muestra «1 pregunta … (1 respondida)»; consola limpia; 375 px; evidencia en `MEMORY.md`.
