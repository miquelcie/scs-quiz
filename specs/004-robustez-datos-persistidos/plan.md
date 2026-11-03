# Plan 004 — Robustez de los datos persistidos

- **Spec:** `specs/004-robustez-datos-persistidos/spec.md`
- **Estado:** propuesto
- **Fecha:** 2026-11-03
- **Dependencias:** ninguna (es la base de 001, 003 y 005)
- **Principios constitucionales:** 1, 2, 3, 4, 5, 6

> Nota de alcance: no se incluye «mapa» ni parámetro «hoy»; no aplican a este cambio (acordado con el usuario).

## 1. Trazabilidad RF → partes

| RF | Dónde se cubre | Verificación |
| --- | --- | --- |
| R1 — `getHistory` seguro | `readJSON` + `normalizeHistory` en `storage.js`/`engine.js` | `tests/cu-05` |
| R2 — `getActiveQuiz` seguro | `normalizeActiveQuiz` en `engine.js`; `getActiveQuiz` en `storage.js` | `tests/cu-03` |
| R3 — escrituras sin excepciones | `writeJSON`, `setAlias`, `clearActiveQuiz` y avisos en `storage.js`/`app.js` | `tests/cu-04`, `tests/cu-06` |
| R4 — descartar respuestas ajenas y normalizar | `sanitizeAnswers` y `normalizeActiveQuiz` | `tests/cu-03` |
| R5 — escapar/convertir datos del historial | `escapeHTML` + normalización + `app.js` | `tests/cu-04`, `tests/cu-05` + manual |
| R6 — arranque con datos corruptos | `readJSON` + `normalizeHistory` | `tests/cu-03`, `tests/cu-05` + manual |
| R7 — no borrar automáticamente | Lectura sin escritura; escritura conserva el array crudo | `tests/cu-05` |

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
| --- | --- | --- | --- |
| `js/engine.js` | modificar | Validadores y normalizadores puros, guardas de formato | R2, R4, R5 |
| `js/storage.js` | modificar | Lectura/escritura segura, avisos únicos, preservación del crudo | R1, R2, R3, R6, R7 |
| `js/app.js` | modificar | Escapado y conversión en el render; aviso de fallo de guardado/borrado | R3, R5 |
| `tests/helpers/failing-storage.js` | crear | `localStorage` en memoria que puede lanzar en `getItem`/`setItem` | R3 |
| `tests/cu-03/recuperar.test.js` | modificar | Corrupción de `scs_active` y normalización | R2, R4, R6 |
| `tests/cu-04/finalizar.test.js` | modificar | Guardado con historial corrupto y fallos de escritura | R3, R6 |
| `tests/cu-05/historial.test.js` | modificar | Historial corrupto, entradas inválidas y escapado | R1, R5, R7 |
| `tests/cu-06/alias.test.js` | modificar | Alias con almacenamiento bloqueado | R3 |
| `MEMORY.md` | modificar | Evidencia manual y decisiones de validación | R1–R7 |

No se crean dependencias ni módulos de terceros. `questions.js` no se toca.

## 3. Funciones puras necesarias

| Función | Entrada → salida | Responsabilidad | RF |
| --- | --- | --- | --- |
| `isPlainObject` | valor → booleano | Excluye `null`, arrays y primitivos | R2, R4 |
| `isNonEmptyString` | valor → booleano | Valida ids, alias y textos | R2, R4 |
| `isValidQuestion` | pregunta → booleano | `id` no vacío, `options` array no vacío, ids únicos y `correctOption` existente | R2, R4 |
| `isValidActiveQuizShape` | snapshot → booleano | Estructura mínima de `scs_active` | R2 |
| `normalizeActiveQuiz` | snapshot → snapshot normalizado o `null` | Valida, recorta índice, sanea respuestas y tiempo | R2, R4 |
| `sanitizeAnswers` | `(questions, answers)` → respuestas limpias | Solo ids propios, valores string no vacíos y opción existente | R4 |
| `normalizeAttempt` | intento → intento normalizado o `null` | Valida forma, recalcula métricas y normaliza fecha/tiempo | R5 |
| `normalizeHistory` | array → array de intentos válidos | Filtra entradas no representables sin lanzar | R1, R5 |
| `formatDate` (guardia) | ISO → texto o `—` | Evita «Invalid Date» | R5 |
| `formatPct` (guardia) | número → texto o `—` | Evita excepciones con valores no finitos | R5 |
| `formatTime` (guardia) | número → texto o `00:00` | Evita `NaN` en el tiempo | R5 |
| `escapeHTML` (ya existe) | texto → texto escapado | Contexto de texto y atributo entrecomillado | R5 |

`normalizeActiveQuiz` y `normalizeAttempt` no escriben en storage ni tocan el DOM: son puras y testeables con `node --test`.

## 4. Algoritmo (pseudocódigo)

```text
FUNCIÓN readJSON(clave, valorPorDefecto):
    INTENTAR:
        texto = localStorage.getItem(clave)
    SI FALLA:
        avisarUnaVez(clave, "lectura bloqueada")
        DEVOLVER valorPorDefecto
    SI texto == null: DEVOLVER valorPorDefecto
    INTENTAR:
        DEVOLVER JSON.parse(texto)
    SI FALLA:
        avisarUnaVez(clave, "JSON inválido")
        DEVOLVER valorPorDefecto

FUNCIÓN writeJSON(clave, valor):
    INTENTAR:
        localStorage.setItem(clave, JSON.stringify(valor))
        DEVOLVER verdadero
    SI FALLA:
        avisarUnaVez(clave, "escritura fallida")
        DEVOLVER falso

FUNCIÓN getHistory():
    crudo = readJSON(HISTORY, [])
    SI crudo no es array:
        avisarUnaVez(HISTORY, "historial no es array")
        DEVOLVER []
    DEVOLVER normalizeHistory(crudo)

FUNCIÓN readRawHistory():
    crudo = readJSON(HISTORY, [])
    SI crudo es array: DEVOLVER crudo
    DEVOLVER []

FUNCIÓN saveAttempt(intento):
    crudo = readRawHistory()          // conserva entradas inválidas (R7)
    crudo.unshift(intento)
    DEVOLVER writeJSON(HISTORY, crudo)

FUNCIÓN deleteAttempt(id):
    crudo = readRawHistory()
    DEVOLVER writeJSON(HISTORY, filtrar(crudo, item.id != id))

FUNCIÓN getActiveQuiz():
    crudo = readJSON(ACTIVE, null)
    SI crudo == null: DEVOLVER null
    normalizado = normalizeActiveQuiz(crudo)
    SI normalizado == null: avisarUnaVez(ACTIVE, "forma inválida")
    DEVOLVER normalizado

FUNCIÓN normalizeActiveQuiz(datos):
    SI NO isPlainObject(datos): DEVOLVER null
    SI NO es array no vacío questions: DEVOLVER null
    SI alguna pregunta NO isValidQuestion: DEVOLVER null
    SI NO isPlainObject(userAnswers): DEVOLVER null
    SI currentIndex NO es entero: DEVOLVER null
    índice = recortar(currentIndex, 0, questions.length - 1)   // R4
    tiempo = númeroFinito(accumulatedMs) Y >= 0 ? accumulatedMs : 0
    respuestas = sanitizeAnswers(questions, userAnswers)
    DEVOLVER { questions, userAnswers: respuestas, currentIndex: índice, accumulatedMs: tiempo }

FUNCIÓN normalizeAttempt(intento):
    SI NO isPlainObject(intento): DEVOLVER null
    SI NO isNonEmptyString(intento.id): DEVOLVER null
    SI NO es array no vacío intento.questionsSnapshot: DEVOLVER null
    SI alguna pregunta NO isValidQuestion: DEVOLVER null
    SI NO isPlainObject(intento.userAnswersSnapshot): DEVOLVER null
    respuestas = sanitizeAnswers(snapshot, userAnswersSnapshot)
    métricas = scoreQuiz(snapshot, respuestas)       // recalcula, no confía en el JSON
    fecha = fechaISOValida(intento.date) ? intento.date : ""
    DEVOLVER {
        id, date: fecha,
        candidateAlias: texto(intento.candidateAlias) o "Aspirante",
        totalQuestions: snapshot.length,
        hits: métricas.hits, errors: métricas.errors,
        unanswered: métricas.unanswered, scorePct: métricas.scorePct,
        totalTimeSeconds: enteroNoNegativo(intento.totalTimeSeconds),
        questionsSnapshot: snapshot,
        userAnswersSnapshot: respuestas
    }
```

`normalizeHistory` aplica `normalizeAttempt` y descarta los `null`; no reescribe el array. `saveAttempt` y `deleteAttempt` trabajan sobre el array crudo para no borrar entradas inválidas (R7).

## 5. Pintado en la interfaz

- `renderLastAttempt()` y `renderHistoryScreen()` reciben datos ya normalizados, pero **todo** valor interpolado se escapa igualmente:
  - textos (`candidateAlias`, `id`, fecha) con `escapeHTML(String(valor))`;
  - números (`totalQuestions`, `hits`, `errors`, `unanswered`, `scorePct`, `totalTimeSeconds`) con `Number(...)` y `formatPct`/`formatTime` con guardia;
  - `data-id="${escapeHTML(String(item.id))}"` para que el atributo no se rompa.
- `renderResults()` usa `textContent` para los campos del resumen y `escapeHTML` para enunciados, opciones y explicaciones (ya existente). Si un intento del historial no tiene snapshots válidos, no llega a pintarse porque `normalizeAttempt` lo descarta.
- Fecha inválida: `formatDate` devuelve `—`; tiempo inválido: `00:00`; porcentaje inválido: `—`.
- Los intentos inválidos no se muestran, pero permanecen en `localStorage` (R7).
- Si `saveAttempt`, `deleteAttempt` o `clearHistory` devuelven falso, `app.js` muestra el modal de aviso del plan 006 («No se pudo guardar/borrar…») y no actualiza la UI como si hubiera funcionado.

## 6. Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| Validadores puros en `engine.js`; `storage.js` solo orquesta lectura/escritura | Se testean sin `localStorage` y se respeta la separación lógica/almacenamiento | Validar dentro de `storage.js`: exige inyectar storage para cada caso y mezcla capas |
| Índice fuera de rango se recorta; tiempo negativo/no finito pasa a 0 | Conserva el examen y las respuestas del usuario; un índice corrupto no debe borrar todo | Devolver `null` (R2 literal): pierde un examen potencialmente válido |
| Las métricas del historial se recalculan desde los snapshots | Impide que un JSON manipulado muestre notas falsas o tipos que rompan `formatPct` | Confiar en `hits/errors/scorePct` guardados: datos inconsistentes y riesgo de excepción |
| `saveAttempt`/`deleteAttempt` leen el array crudo y preservan entradas inválidas | Cumple R7 y evita pérdida silenciosa al guardar o borrar | Usar `getHistory()` (filtrado) para escribir: elimina entradas corruptas sin avisar |
| Aviso una vez por clave y sesión | Evita inundar la consola con cada respuesta | Avisar en cada lectura: ruido; no avisar: fallo invisible |
| Guardias en `formatDate`/`formatPct`/`formatTime` | Defensa en profundidad para datos de cualquier origen | Confiar solo en la normalización: un cambio futuro puede saltarse la capa |
| Las escrituras devuelven booleano y la UI avisa del fallo | La pérdida de un intento o de un borrado no puede ser silenciosa (P.5) | Solo `console.warn` (R3 literal): el usuario cree que guardó/borró |
| No borrar datos corruptos al leer | Permite diagnóstico y cumple R7 | Limpiar automáticamente: oculta el problema y destruye datos |
| `getItem` también se protege | `localStorage` puede lanzar `SecurityError` con almacenamiento bloqueado | Proteger solo `setItem`: el arranque puede romperse igual |

## 7. Estrategia de tests (`node --test`)

| Archivo | Caso | RF |
| --- | --- | --- |
| `tests/cu-03/recuperar.test.js` | `scs_active` con `{`, `null`, texto plano, `{}`, `questions: []` → `null` | R2, R6 |
| `tests/cu-03/recuperar.test.js` | Pregunta sin `id`, sin `options`, `options` vacío o `correctOption` inexistente → `null` | R2 |
| `tests/cu-03/recuperar.test.js` | `userAnswers` `null` o array → `null`; `currentIndex` `"2"` o `2.5` → `null` | R2 |
| `tests/cu-03/recuperar.test.js` | `currentIndex: 999` → recortado al último; `accumulatedMs: -5` o `NaN` → 0 | R2, R4 |
| `tests/cu-03/recuperar.test.js` | Respuesta con id ajeno o con opción inexistente → se descarta; respuesta válida se conserva | R4 |
| `tests/cu-03/recuperar.test.js` | Round-trip válido conserva preguntas, respuestas, índice y tiempo | R2, R4 |
| `tests/cu-04/finalizar.test.js` | Guardar con `scs_history = "{"` no lanza y deja un intento visible | R3, R6 |
| `tests/cu-04/finalizar.test.js` | Guardar con `[null, intentoVálido]` conserva el crudo y muestra solo el válido | R5, R7 |
| `tests/cu-04/finalizar.test.js` | `setItem` que lanza no propaga y devuelve falso | R3 |
| `tests/cu-05/historial.test.js` | `getHistory` con `null`, `{}`, `"texto"` y número → `[]` | R1, R6 |
| `tests/cu-05/historial.test.js` | Entradas sin `id`, sin snapshots, con `scorePct` string o `date` inválida se filtran o normalizan | R1, R5 |
| `tests/cu-05/historial.test.js` | `deleteAttempt` conserva las entradas inválidas del array crudo | R7 |
| `tests/cu-05/historial.test.js` | `escapeHTML` convierte `<img src=x onerror=...>` en texto | R5 |
| `tests/cu-06/alias.test.js` | `getItem`/`setItem` que lanzan no rompen el alias | R3 |
| `tests/helpers/failing-storage.js` | Backend con `failOnGet`/`failOnSet` para inyectar en `globalThis.localStorage` | R3 |

La verificación de `innerHTML` real y del modal de aviso es manual; los tests cubren las funciones puras y el contrato de storage.

## 8. Verificación manual y evidencia

1. `localStorage.setItem('scs_active', '{')` y recargar: la app carga, no muestra banner y permite iniciar un test.
2. `localStorage.setItem('scs_history', 'null')` y recargar: estado vacío; terminar un test y comprobar que se guarda.
3. `scs_active` con `currentIndex: 999`: la recuperación no rompe y abre una pregunta válida.
4. `scs_active` con una respuesta a un id inexistente: el banner y la corrección no la cuentan.
5. Historial con `<img src=x onerror=alert(1)>` en `candidateAlias` o `id`: se pinta como texto, sin ejecutar HTML.
6. Forzar un fallo de escritura (DevTools → Application → Storage, o el helper en tests): la app avisa y no muestra el intento como guardado.
7. Consola: solo avisos controlados, sin excepciones; 375 px; evidencia en `MEMORY.md`.

## 9. Conformidad con la constitución

- **P.1:** sin dependencias; el backend de pruebas es JS nativo.
- **P.2:** R1–R7 con criterios y tests; las desviaciones se registran en §10.
- **P.3:** `localStorage` solo en `storage.js`; validación pura en `engine.js`; `app.js` solo render/estado.
- **P.4:** `node --test` + verificación manual con flujo, consola y 375 px; evidencia en `MEMORY.md`.
- **P.5:** datos corruptos no se borran; todo lo dinámico se escapa; los fallos de guardado/borrado se avisan.
- **P.6:** mensajes y comentarios en español; identificadores en inglés.

## 10. Enmiendas o aclaraciones de spec

- **004 R2:** la spec dice «`currentIndex` entero dentro de rango» y «`accumulatedMs` >= 0» como condiciones de validez, mientras R4 pide normalizar. Se resuelve: estructura/tipos inválidos → `null`; índice fuera de rango → recorte; tiempo no finito o negativo → 0. Hay que actualizar R2 para que no contradiga R4.
- **004 R1:** «una sola vez por lectura inválida» se concreta como «una vez por clave y sesión».
- **004 R5:** se añaden `date`, `totalTimeSeconds` y `candidateAlias` al conjunto de campos que se escapan o convierten, y se distingue texto de atributo.
- **004 R7:** se aclara que las lecturas nunca escriben; las escrituras conservan el array crudo y solo reemplazan la clave cuando el JSON de nivel superior es irrecuperable (R6).
- **004 R3:** se eleva el mínimo de «registrar el fallo» a «devolver falso y avisar en la UI» para no perder datos en silencio (P.5); la spec puede recogerlo como refuerzo.
