# 004 — Robustez de los datos persistidos

- **Estado:** propuesta
- **Fecha:** 2026-11-03
- **Prioridad:** alta
- **Caso de uso:** CU-03 (recuperar) / CU-04 (finalizar) / CU-05 (historial)
- **Componentes:** `js/storage.js`, `js/app.js`, `tests/cu-03`, `tests/cu-04`, `tests/cu-05`

## 1. Problema

`Storage.getHistory()` y `Storage.getActiveQuiz()` hacen `JSON.parse` sin protección (`js/storage.js:6,17`). Un valor corrupto en `localStorage` lanza una excepción:

- Si falla `scs_active`, `DOMContentLoaded` aborta en `js/app.js:360` antes de registrar los listeners y la app queda inutilizable.
- Si falla `scs_history`, se rompen `renderLastAttempt()` y el guardado de intentos.
- Un `scs_active` con forma inválida (sin `questions`, `currentIndex` fuera de rango, `userAnswers` no objeto) rompe `renderQuestion()`.
- Las respuestas de un snapshot pueden incluir ids que no pertenecen al cuestionario y desvirtuar el recuento de pendientes.
- Los campos del historial (`item.id`, `item.totalQuestions`, `item.hits`…) se interpolan en `innerHTML` sin escapar (`js/app.js:247-265`).

## 2. Objetivo

Que la aplicación arranque y siga siendo usable con datos corruptos, manipulados o de versiones anteriores, y que todo dato persistido se trate como no confiable.

## 3. Fuera de alcance

- Migrar esquemas antiguos con pérdida cero.
- Gestionar cuotas de `localStorage` con avisos al usuario (solo evitar el crash).
- Cifrar o firmar los datos.

## 4. Requisitos

- **R1** — `getHistory()` devuelve `[]` si la clave no existe, el JSON es inválido, el valor es `null` o no es un array. Emite un `console.warn` una sola vez por lectura inválida.
- **R2** — `getActiveQuiz()` devuelve `null` si la clave no existe, el JSON es inválido o la forma no es válida: `questions` array no vacío, cada pregunta con `id` y `options`, `userAnswers` objeto, `currentIndex` entero dentro de rango y `accumulatedMs` número finito `>= 0`.
- **R3** — `saveAttempt`, `deleteAttempt`, `clearHistory`, `setAlias`, `setActiveQuiz` y `clearActiveQuiz` no deben propagar excepciones no controladas (JSON corrupto, cuota llena, almacenamiento bloqueado). Como mínimo, registran el fallo y la app continúa.
- **R4** — Al restaurar un examen, descartar las respuestas cuyo id no exista en `questions` y normalizar `currentIndex` y `accumulatedMs`.
- **R5** — Todo valor dinámico del historial y de «Último resultado» debe insertarse escapado o convertido a número antes de ir a `innerHTML`; esto incluye `id`, `totalQuestions`, `hits`, `errors`, `unanswered` y `scorePct`.
- **R6** — La app debe inicializar por completo con `scs_history = "null"` y con `scs_active = "{"`: portada usable, listeners activos, historial vacío.
- **R7** — No borrar automáticamente los datos corruptos al leerlos; se ignoran y se conservan para diagnóstico.

## 5. Criterios de aceptación

- [ ] Con `scs_active` corrupto, la app carga, no muestra banner y permite iniciar un test.
- [ ] Con `scs_history` corrupto, la portada muestra el estado vacío y se puede completar y guardar un intento.
- [ ] Un `scs_active` con `currentIndex: 999` no rompe la recuperación.
- [ ] Un snapshot con respuestas a preguntas inexistentes se restaura sin contar esas respuestas.
- [ ] Un historial manipulado con `<img src=x onerror=...>` se renderiza como texto y no ejecuta HTML.
- [ ] `localStorage.setItem` que lanza una excepción no deja la app en estado inconsistente.
- [ ] `npm test` cubre los casos anteriores y sigue en verde.

## 6. Verificación

### Automática

- `tests/cu-03`: JSON inválido, `null`, forma inválida, índice fuera de rango y respuestas ajenas.
- `tests/cu-04`: guardar un intento con historial corrupto no lanza.
- `tests/cu-05`: `getHistory` con JSON inválido y con objeto devuelve `[]`.

Se añadirá un `localStorage` de pruebas que pueda simular fallos de escritura.

### Manual (Chrome DevTools)

1. `localStorage.setItem('scs_active', '{')` y recargar.
2. `localStorage.setItem('scs_history', 'null')` y recargar.
3. Comprobar inicio, historial, inicio de test y finalización.
4. Revisar la consola: solo avisos controlados, sin excepciones.

## 7. Riesgos y notas

- Validar en lectura añade coste al arranque; el banco de un intento puede ser grande, pero la validación es lineal y aceptable.
- El escapado de números es defensa en profundidad: los datos solo se manipulan desde el mismo origen, pero el coste es nulo.
- Decisión abierta: si `saveAttempt` falla por cuota, ¿avisar con el modal o solo registrar? Este spec exige no romper; el aviso queda para un spec futuro de cuotas.
