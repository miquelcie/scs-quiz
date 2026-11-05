# Plan 007 — Validación del alias de usuario

- **Spec:** `specs/007-alias-validation/spec.md`
- **Estado:** propuesto
- **Fecha:** 2026-11-05
- **Dependencias:** 004 (lectura y escritura defensivas de `localStorage`) y CU-06 (alias)
- **Principios constitucionales:** 2, 3, 4, 5, 6

## 1. Trazabilidad RF → partes

| RF | Dónde se cubre | Verificación |
| --- | --- | --- |
| R1 — conjunto de caracteres | `ALIAS_PATTERN` en `js/engine.js` | `tests/cu-06` |
| R2 — máximo de 30 | `ALIAS_MAX_LENGTH` y `sanitizeAlias()` | `tests/cu-06` |
| R3 — alias vacío válido | `isValidAlias()` y `#display-alias` | `tests/cu-06` + manual |
| R4 — saneado al escribir/pegar | listener `input` de `js/app.js` | manual |
| R5 — estado, input, display y storage | listener `input` de `js/app.js` | manual + inspección |
| R6 — alias heredado | carga inicial de `js/app.js` | manual |
| R7 — funciones puras | `js/engine.js` | `tests/cu-06` |
| R8 — ayuda accesible | `index.html` | manual (árbol de accesibilidad) |
| R9 — historial intacto | sin cambios en snapshots | manual |
| R10 — sin dependencias | todo el cambio | inspección |
| R11 — tests primero | `tests/cu-06/alias.test.js` | `node --test` |

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
| --- | --- | --- | --- |
| `js/engine.js` | modificar | `ALIAS_MAX_LENGTH`, `ALIAS_PATTERN`, `sanitizeAlias()` e `isValidAlias()` | R1, R2, R3, R7 |
| `js/app.js` | modificar | Saneado en el `input`, carga del alias heredado, estado, display y persistencia | R4, R5, R6 |
| `index.html` | modificar | `placeholder` válido, texto de ayuda, `aria-describedby` y atributos de teclado | R8 |
| `tests/cu-06/alias.test.js` | modificar | Tests de las funciones puras | R1–R3, R7, R11 |
| `AGENTS.md` | modificar | Documentar la regla de alias en CU-06 | R1 |
| `MEMORY.md` | modificar | Decisión, normalización de alias heredados y evidencia manual | R1–R11 |

No se modifica `js/storage.js`: `getAlias()` y `setAlias()` ya son defensivos y no imponen reglas de formato. No se cambian las claves de `localStorage` ni el esquema de los intentos.

## 3. Funciones puras necesarias

| Función | Entrada → salida | Responsabilidad | RF |
| --- | --- | --- | --- |
| `sanitizeAlias` | cualquier valor → `string` | Convierte a cadena, elimina caracteres no permitidos y recorta a 30 | R1, R2, R4 |
| `isValidAlias` | cualquier valor → `boolean` | Verdadero para cadena vacía o alias que cumple patrón y longitud | R1–R3, R7 |

Constantes:

- `ALIAS_MAX_LENGTH = 30`.
- `ALIAS_PATTERN = /^[\p{L}\p{N}_-]+$/u`.

`sanitizeAlias()` no debe lanzar con `null`, `undefined`, números, arrays u objetos: devuelve `''`. `isValidAlias()` tampoco debe lanzar.

## 4. Algoritmo

```text
FUNCIÓN sanitizeAlias(valor):
    SI valor no es string:
        DEVOLVER ""
    texto = valor.replace(/[^\p{L}\p{N}_-]/gu, "")
    DEVOLVER texto.slice(0, ALIAS_MAX_LENGTH)

FUNCIÓN isValidAlias(valor):
    SI valor === "":
        DEVOLVER verdadero
    SI valor no es string:
        DEVOLVER falso
    SI longitud de valor > ALIAS_MAX_LENGTH:
        DEVOLVER falso
    DEVOLVER ALIAS_PATTERN.test(valor)
```

Notas:

- El filtrado elimina los espacios en lugar de sustituirlos: «María Rodríguez» → «MaríaRodríguez».
- El filtrado se aplica antes del recorte para que caracteres eliminados no consuman longitud.
- La expresión se usa sin flag `g` en `isValidAlias()` para que `test()` no conserve `lastIndex`.

## 5. Integración en la interfaz

### `index.html`

```html
<input
    type="text"
    id="input-alias"
    class="form-input"
    placeholder="Ej.: maria_rodriguez"
    maxlength="30"
    autocomplete="username"
    autocapitalize="none"
    spellcheck="false"
    aria-describedby="alias-help"
>
<p class="form-hint" id="alias-help">
    Solo letras, números, guion y guion bajo. Sin espacios.
</p>
```

Se mantiene el `maxlength="30"` como primera barrera del navegador; la fuente de verdad sigue siendo `sanitizeAlias()`.

### `js/app.js`

Al cargar (`DOMContentLoaded`):

```text
guardado = Storage.getAlias()
alias = sanitizeAlias(guardado)
state.alias = alias
input.value = alias
#display-alias = alias o "Aspirante"
SI alias !== guardado:
    Storage.setAlias(alias)
```

En el evento `input`:

```text
bruto = input.value
saneado = sanitizeAlias(bruto)
SI bruto !== saneado:
    posicion = input.selectionStart
    prefijo = sanitizeAlias(bruto.slice(0, posicion))
    input.value = saneado
    input.setSelectionRange(prefijo.length, prefijo.length)
state.alias = saneado
Storage.setAlias(saneado)
#display-alias = saneado o "Aspirante"
```

Con esto se evita que el cursor salte al final cuando se elimina un carácter en medio del texto. El estado y el almacenamiento nunca reciben el valor bruto.

### Compatibilidad con el resto del flujo

- `createAttempt()` ya usa `(alias || '').trim() || DEFAULT_ALIAS`; un alias saneado vacío sigue produciendo «Aspirante».
- `renderResults()` y `renderHistoryScreen()` no cambian: siguen escapando el alias con `escapeHTML()`.
- Los intentos antiguos conservan su `candidateAlias` original porque no se reescribe el historial.

## 6. Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| Filtrar en vivo en lugar de mostrar error | Cumple «solo permita» y evita estados inválidos persistentes | Escribir libremente y bloquear el inicio: más fricción y estados intermedios inválidos |
| Letras Unicode con `\p{L}` | Conserva tildes y `ñ`, normales en nombres españoles | Solo ASCII `[A-Za-z0-9]`: rechaza «María» |
| Permitir `_` y `-` | Son separadores habituales de nombres de usuario | Solo alfanumérico: rompe `maria_rodriguez` |
| Saneado y validación puros en `engine.js` | Se prueban sin DOM y se mantiene la separación lógica/interfaz | Validación inline en `app.js`: sin cobertura |
| Normalizar el alias heredado al cargar | Deja los datos actuales conformes a la regla | Dejar valores inválidos guardados: incumple el objetivo |
| No migrar los alias del historial | Los intentos son snapshots inmutables y deben conservar su contexto | Reescribir todo el historial: riesgo y pérdida de datos |
| No usar `pattern` HTML como única validación | La validación nativa no cubre todos los casos y el campo no se envía con un formulario | Confiar solo en atributos HTML: sin control real |
| Recortar a 30 tras filtrar | Coincide con `maxlength` y evita valores largos por pegado | Recortar antes: un símbolo eliminado podría dejar el alias más corto de lo necesario |

## 7. Estrategia de tests (`node --test`)

| Archivo | Caso | RF |
| --- | --- | --- |
| `tests/cu-06/alias.test.js` | `sanitizeAlias` conserva letras, tildes, `ñ`, dígitos, `_` y `-` | R1, N4 |
| `tests/cu-06/alias.test.js` | `sanitizeAlias` elimina espacios, `@`, puntos, emojis y símbolos | R1, R4 |
| `tests/cu-06/alias.test.js` | `sanitizeAlias` recorta a 30 caracteres | R2 |
| `tests/cu-06/alias.test.js` | `sanitizeAlias` devuelve `''` para valores no string sin lanzar | R7 |
| `tests/cu-06/alias.test.js` | `isValidAlias` acepta alias válidos y la cadena vacía | R1–R3 |
| `tests/cu-06/alias.test.js` | `isValidAlias` rechaza espacios, símbolos y más de 30 caracteres | R1, R2 |
| `tests/cu-06/alias.test.js` | `isValidAlias` no lanza con tipos inesperados | R7 |

El resto del comportamiento (input, cursor, persistencia, alias heredado y accesibilidad) es DOM y se verifica manualmente; no se instala un arnés DOM para no añadir dependencias.

## 8. Fases de implementación

1. **Tests primero:** añadir los casos de `sanitizeAlias()` e `isValidAlias()` en `tests/cu-06/alias.test.js`; comprobar que fallan por exportaciones ausentes.
2. **Lógica pura:** implementar `ALIAS_MAX_LENGTH`, `ALIAS_PATTERN`, `sanitizeAlias()` e `isValidAlias()` en `js/engine.js`.
3. **Integración del input:** importar las funciones en `js/app.js`, sanear en el evento `input` y conservar la posición del cursor.
4. **Alias heredado:** normalizar el valor de `Storage.getAlias()` al cargar y persistirlo si cambia.
5. **Interfaz y accesibilidad:** actualizar `index.html` con el nuevo `placeholder`, el texto de ayuda y `aria-describedby`.
6. **Verificación y documentación:** ejecutar `node --test`, probar el flujo en Chrome DevTools, revisar consola y 375 px, y actualizar `AGENTS.md` y `MEMORY.md`.

## 9. Verificación manual y evidencia

1. Con `scs_alias` vacío, comprobar que el campo está vacío y se muestra «Aspirante».
2. Escribir un espacio, `@`, un punto y un emoji; comprobar que no aparecen en el input.
3. Pegar `María Rodríguez` y comprobar que se convierte en `MaríaRodríguez` y que el cursor queda en una posición coherente.
4. Escribir `maria_rodriguez-01` y `María_Ñandú`; comprobar que se conservan.
5. Superar los 30 caracteres y comprobar el recorte.
6. Recargar y comparar input, `#display-alias` y `scs_alias`.
7. Sembrar un alias antiguo inválido con `initScript` y comprobar la normalización al cargar.
8. Finalizar un test y comprobar el alias saneado en resultados e historial.
9. Revisar un intento antiguo y comprobar que su alias no cambia.
10. Revisar `aria-describedby` en el árbol de accesibilidad, la consola limpia y la vista a 375 px.

Evidencia final en `MEMORY.md`: casos probados, valores observados, resultado de `node --test` y comprobación móvil.

## 10. Conformidad con la constitución

- **P.1:** sin dependencias; solo JavaScript nativo y APIs del navegador.
- **P.2:** cada RF tiene criterio y verificación; los criterios de aceptación de la spec son comprobables.
- **P.3:** `engine.js` contiene la lógica pura; `app.js` el estado, los eventos y la persistencia; `index.html` la estructura y las etiquetas de accesibilidad.
- **P.4:** tests con el runner nativo y verificación manual con flujo completo, consola y 375 px.
- **P.5:** no se borran datos; los intentos antiguos se conservan y solo se normaliza el alias actual.
- **P.6:** textos y comentarios en español; identificadores en inglés.

## 11. Enmiendas o aclaraciones

- **007 R1:** se concreta el conjunto de caracteres como letras Unicode, dígitos, `_` y `-`. Si el producto prefiere otro conjunto, debe enmendarse la spec antes de implementar.
- **007 R3:** «vacío» significa cadena vacía después del saneado; un alias compuesto solo por espacios también queda vacío.
- **007 R6:** la normalización de alias heredados modifica el valor actual, pero no los snapshots del historial.
- **007 R8:** el texto de ayuda es estático; no se añade un estado de error porque el filtrado impide que exista un valor inválido persistente.
