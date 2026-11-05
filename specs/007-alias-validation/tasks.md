# Tasks 007 — Validación del alias de usuario

- **Spec:** `specs/007-alias-validation/spec.md`
- **Plan:** `specs/007-alias-validation/plan.md`
- **Estado:** completada
- **Fecha:** 2026-11-05
- **Dependencias externas:** 004 (lectura y escritura defensivas de `localStorage`) y CU-06 (alias). El historial y las claves de `localStorage` no cambian.

> Convención: una tarea se marca `[x]` únicamente cuando se cumple su línea **Hecho cuando**. Cada tarea está pensada para 20–30 minutos.

## Cobertura RF

| RF | Tareas |
| --- | --- |
| R1 — conjunto de caracteres | T01, T02, T03, T04, T06 |
| R2 — máximo de 30 | T01, T02, T03, T06 |
| R3 — alias vacío válido | T02, T04, T05 |
| R4 — saneado al escribir/pegar | T04 |
| R5 — estado, input, display y storage | T04 |
| R6 — alias heredado | T05 |
| R7 — funciones puras | T01, T02, T03 |
| R8 — ayuda accesible | T06 |
| R9 — historial intacto | T07 |
| R10 — sin dependencias | T01–T08 |
| R11 — tests primero | T01, T02 |

## Fase 0 — Tests primero

- [x] **T01 — Probar `sanitizeAlias()`**
  - **RF:** R1, R2, R4, R7, R11
  - **Depende de:** —
  - **Archivos:** `tests/cu-06/alias.test.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** hay tests que comprueban que se conservan letras con tildes y `ñ`, dígitos, `_` y `-`; que se eliminan espacios, `@`, puntos, emojis y otros símbolos; que un alias de 31+ caracteres se recorta a 30; y que `null`, `undefined`, números, arrays y objetos devuelven `''` sin lanzar. Los tests fallan inicialmente por la exportación ausente.

- [x] **T02 — Probar `isValidAlias()`**
  - **RF:** R1, R2, R3, R7, R11
  - **Depende de:** —
  - **Archivos:** `tests/cu-06/alias.test.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** hay tests que aceptan `''`, `maria`, `María_Ñandú` y `maria-01`; y que rechazan cadenas con espacios, `@`, puntos, emojis, más de 30 caracteres y valores que no son string. La función no lanza con tipos inesperados. Los tests fallan inicialmente por la exportación ausente.

## Fase 1 — Lógica pura

- [x] **T03 — Implementar la validación en `engine.js`**
  - **RF:** R1, R2, R3, R7
  - **Depende de:** T01, T02
  - **Archivos:** `js/engine.js`
  - **Estimación:** 25 min
  - **Hecho cuando:** existen `ALIAS_MAX_LENGTH = 30`, `ALIAS_PATTERN = /^[\p{L}\p{N}_-]+$/u`, `sanitizeAlias()` e `isValidAlias()` con el comportamiento descrito en el plan; no tocan DOM ni almacenamiento; y `node --test tests/cu-06/alias.test.js` queda en verde.

## Fase 2 — Integración en la aplicación

- [x] **T04 — Sanear el alias en el evento `input`**
  - **RF:** R1, R2, R3, R4, R5
  - **Depende de:** T03
  - **Archivos:** `js/app.js`
  - **Estimación:** 30 min
  - **Hecho cuando:** al escribir o pegar, el input solo muestra el valor saneado; `state.alias`, `#display-alias` y `Storage.setAlias()` reciben ese mismo valor; el cursor se recoloca en la posición equivalente cuando se elimina un carácter intermedio; y un alias vacío muestra «Aspirante» sin error.

- [x] **T05 — Normalizar el alias heredado al cargar**
  - **RF:** R3, R6
  - **Depende de:** T03
  - **Archivos:** `js/app.js`
  - **Estimación:** 20 min
  - **Hecho cuando:** al cargar, `Storage.getAlias()` pasa por `sanitizeAlias()`; el input y `#display-alias` muestran el valor normalizado; si el valor cambia se vuelve a guardar con `Storage.setAlias()`; y un alias corrupto o ausente no rompe el arranque.

- [x] **T06 — Actualizar el campo y su ayuda en `index.html`**
  - **RF:** R1, R2, R8
  - **Depende de:** —
  - **Archivos:** `index.html`
  - **Estimación:** 20 min
  - **Hecho cuando:** el `placeholder` es un ejemplo válido (por ejemplo, `Ej.: maria_rodriguez`); existe un texto de ayuda que explica «Solo letras, números, guion y guion bajo. Sin espacios.»; el input tiene `aria-describedby` apuntando a ese texto, `maxlength="30"`, `autocomplete="username"`, `autocapitalize="none"` y `spellcheck="false"`; y no se rompe el diseño a 375 px.

## Fase 3 — Verificación y documentación

- [x] **T07 — Verificar el flujo y registrar la evidencia**
  - **RF:** R1–R11
  - **Depende de:** T04, T05, T06
  - **Archivos:** `MEMORY.md`
  - **Estimación:** 30 min
  - **Hecho cuando:** se ejecuta `node --test` completo en verde; se comprueban escritura, pegado, tildes, `ñ`, recorte a 30, alias vacío, recarga y alias heredado; se confirma que los intentos antiguos conservan su alias; la consola está limpia; se revisa el árbol de accesibilidad del campo; se prueba a 375 px; y la evidencia queda registrada en `MEMORY.md`.

- [x] **T08 — Documentar la regla de alias en `AGENTS.md`**
  - **RF:** R1, R9
  - **Depende de:** T03
  - **Archivos:** `AGENTS.md`, `MEMORY.md`
  - **Estimación:** 15 min
  - **Hecho cuando:** `AGENTS.md` documenta en CU-06 el conjunto de caracteres permitido, el máximo de 30, que el alias vacío es válido y que el historial no se reescribe; `MEMORY.md` registra la decisión y la normalización de alias heredados; y ambos documentos quedan sincronizados con el comportamiento implementado.
