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
- Un `scs_active` con forma inválida (sin `questions`, `userAnswers` no objeto, pregunta sin opciones) rompe `renderQuestion()`.
- Las respuestas de un snapshot pueden incluir ids que no pertenecen al cuestionario y desvirtuar el recuento de pendientes.
- Los campos del historial (`item.id`, `item.totalQuestions`, `item.hits`…) se interpolan en `innerHTML` sin escapar (`js/app.js:247-265`).

## 2. Objetivo

Que la aplicación arranque y siga siendo usable con datos corruptos, manipulados o de versiones anteriores, y que todo dato persistido se trate como no confiable.

## 3. Fuera de alcance

- Migrar esquemas antiguos con pérdida cero.
- Implementar reintentos, límites de cuota o migraciones automáticas; solo se evita el crash y se avisa del fallo de escritura (R3).
- Cifrar o firmar los datos.

## 4. Requisitos

- **R1** — `getHistory()` devuelve `[]` si la clave no existe, el JSON es inválido, el valor es `null` o no es un array. Emite un `console.warn` una sola vez por clave y sesión, no en cada lectura.
- **R2** — `getActiveQuiz()` devuelve `null` si la clave no existe, el JSON es inválido o la estructura o los tipos no son válidos. Se consideran estructura/tipos inválidos: `questions` que no sea un array no vacío; alguna pregunta con `id` vacío, `options` no array o vacío, ids de opción duplicados o `correctOption` inexistente; `userAnswers` que no sea objeto plano; y `currentIndex` que no sea entero. En cambio, un `currentIndex` entero fuera de rango se recorta al rango válido y un `accumulatedMs` no finito o negativo se normaliza a `0`, conservando el examen (R4).
- **R3** — `saveAttempt`, `deleteAttempt`, `clearHistory`, `setAlias`, `setActiveQuiz` y `clearActiveQuiz` no deben propagar excepciones no controladas (JSON corrupto, cuota llena, almacenamiento bloqueado). Las escrituras devuelven un booleano: `true` si se guardó y `false` si falló. Ante `false`, la interfaz avisa al usuario mediante el modal del spec 006 y no presenta la operación como realizada.
- **R4** — Al restaurar un examen, descartar las respuestas cuyo id no exista en `questions`, cuyo valor no sea un string no vacío o cuya opción no exista en la pregunta; normalizar `currentIndex` recortándolo al rango y `accumulatedMs` a un número finito no negativo.
- **R5** — Todo valor dinámico del historial y de «Último resultado» debe insertarse escapado o convertido antes de ir a `innerHTML`. Se incluyen, como texto, `candidateAlias`, `id`, `date`, `totalQuestions`, `hits`, `errors`, `unanswered`, `scorePct` y `totalTimeSeconds`; y como atributo entrecomillado (por ejemplo `data-id`), el mismo `id` escapado. Los números se convierten con `Number(...)` y los formateadores no deben producir `NaN` ni «Invalid Date».
- **R6** — La app debe inicializar por completo con `scs_history = "null"` y con `scs_active = "{"`: portada usable, listeners activos, historial vacío.
- **R7** — No borrar automáticamente los datos corruptos al leerlos; se ignoran y se conservan para diagnóstico. Las lecturas nunca escriben. Las escrituras (`saveAttempt`, `deleteAttempt`, `clearHistory`) operan sobre el array crudo, de modo que preservan las entradas inválidas y solo reemplazan la clave cuando el JSON de nivel superior es irrecuperable.

## 5. Criterios de aceptación

- [ ] Con `scs_active` corrupto, la app carga, no muestra banner y permite iniciar un test.
- [ ] Con `scs_history` corrupto, la portada muestra el estado vacío y se puede completar y guardar un intento.
- [ ] Un `scs_active` con `currentIndex: 999` no rompe la recuperación: se recorta a una pregunta válida.
- [ ] Un `scs_active` con `accumulatedMs` negativo o no finito se restaura con tiempo `0`.
- [ ] Un snapshot con respuestas a preguntas inexistentes, vacías o con opción inexistente se restaura sin contar esas respuestas.
- [ ] Un historial manipulado con `<img src=x onerror=...>` en `candidateAlias` o `id` se renderiza como texto y no ejecuta HTML.
- [ ] `localStorage.setItem` que lanza una excepción no deja la app en estado inconsistente; la operación devuelve `false` y la interfaz avisa.
- [ ] Guardar o borrar un intento conserva las entradas inválidas del array crudo.
- [ ] `npm test` cubre los casos anteriores y sigue en verde.

## 6. Verificación

### Automática

- `tests/cu-03`: JSON inválido, `null`, forma inválida, índice fuera de rango, tiempo no finito y respuestas ajenas o con opción inexistente.
- `tests/cu-04`: guardar un intento con historial corrupto no lanza; un fallo de `setItem` devuelve `false`; se conservan entradas inválidas.
- `tests/cu-05`: `getHistory` con JSON inválido y con objeto devuelve `[]`; `deleteAttempt` preserva el crudo; `escapeHTML` neutraliza HTML.
- `tests/cu-06`: alias con almacenamiento bloqueado no rompe.

Se añadirá un `localStorage` de pruebas que pueda simular fallos de lectura y escritura.

### Manual (Chrome DevTools)

1. `localStorage.setItem('scs_active', '{')` y recargar.
2. `localStorage.setItem('scs_history', 'null')` y recargar.
3. `scs_active` con `currentIndex: 999` y con una respuesta a un id inexistente: comprobar la recuperación.
4. Historial con `<img src=x onerror=alert(1)>` en alias o id: comprobar que se pinta como texto.
5. Forzar un fallo de escritura o de borrado: comprobar el aviso y que la UI no finge éxito.
6. Comprobar inicio, historial, inicio de test, finalización y consola (solo avisos controlados).
7. Revisar la vista a 375 px.

## 7. Riesgos y notas

- Validar en lectura añade coste al arranque; el banco de un intento puede ser grande, pero la validación es lineal y aceptable.
- El escapado de números es defensa en profundidad: los datos solo se manipulan desde el mismo origen, pero el coste es nulo.
- El aviso de fallo de escritura o borrado se resuelve con el modal del spec 006 y un booleano de retorno (R3); no se implementan reintentos, límites de cuota ni estrategias de liberación de espacio, que quedan fuera de alcance.
