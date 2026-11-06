# Spec 009 — Mejoras medias: cuota, contraste, UX de finalización, historial paginado, impresión y mantenibilidad

## 1. Problema

El spec 008 cerró las mejoras rápidas del informe (`docs/informe-mejoras.md`). Queda pendiente el bloque «Medias», que aborda deuda estructural y de experiencia de usuario:

- **1.1 — Sin control de cuota de `localStorage`.** El historial crece sin límite y cada intento guarda un snapshot completo del cuestionario. `writeJSON` devuelve `false` cuando falla la escritura, pero la app solo reacciona *después* de perder el guardado; no hay límite de entradas ni aviso previo.
- **2.4 — Contraste sin auditar.** El informe estima que `--tinta-suave` (#566C82) ronda 4.4:1 sobre blanco. La medición real da ≈5.4:1 sobre `--papel` y ≈5.0:1 sobre `--azul-papel`, es decir **supera AA**. Aun así, la variable se usa en 21 reglas y nunca se ha auditado el conjunto (incluidos `--pendiente`, `--acierto`, `--error` sobre sus fondos y los textos del cabecero). Falta una verificación registrada.
- **3.2 — Botones de finalización duplicados.** En la última pregunta conviven dos controles con la misma etiqueta «Finalizar test»: `#btn-next-q` (navegación) y `#btn-finish-quiz` (barra de herramientas).
- **3.4 — Historial sin límite visual.** `renderHistoryScreen()` pinta todos los intentos de una vez; con decenas de intentos la pantalla se vuelve larga e inmanejable.
- **3.5 — No se puede exportar el resultado.** No hay forma de imprimir o guardar en PDF la corrección de un simulacro.
- **6.1 — `app.js` concentrado (588 líneas).** Estado, temporizador, modal, renderizado y flujo de examen viven en un único módulo, lo que dificulta la lectura y el mantenimiento.
- **6.2 — Identificadores y selectores repetidos como literales.** `'quiz'`, `'home'`, `'results'`, `'history'` y decenas de `document.getElementById('…')` aparecen dispersos.
- **6.3 — `prefixes` duplicado.** El array `['A','B','C','D','E']` se declara en `renderQuestion()` y en `renderResults()`.
- **6.4 — Sin JSDoc.** Las funciones públicas de `engine.js` y `storage.js` solo tienen comentarios de una línea.
- **7.2 — Cobertura de `buildQuiz` con `count` inválido.** **Ya implementada en el spec 008** (`tests/cu-01/iniciar-simulacro.test.js`). En este spec se verifica su existencia y se amplía la cobertura a los helpers puros nuevos.

## 2. Objetivos

1. Evitar la pérdida silenciosa de datos por agotamiento de `localStorage`, con un límite explícito y confirmación antes de cualquier borrado.
2. Dejar constancia auditada del contraste de la paleta y corregir solo lo que incumpla WCAG 2.1 AA.
3. Eliminar la ambigüedad de los controles de finalización.
4. Hacer el historial manejable con paginación incremental («Cargar más»).
5. Permitir imprimir la corrección de un simulacro.
6. Reducir `app.js` dividiéndolo en módulos por responsabilidad, sin cambiar el comportamiento.
7. Centralizar constantes y eliminar duplicados; documentar las APIs públicas con JSDoc.
8. Mantener `npm test` en verde y ampliar la cobertura de la lógica pura nueva.

## 3. Alcance

**En alcance:** 1.1, 2.4, 3.2, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4 y 7.2 del informe.

**Archivos afectados:**
- `js/engine.js` (helpers puros nuevos + JSDoc)
- `js/storage.js` (límite de historial + JSDoc)
- `js/app.js` (reducción a arranque y bindings)
- `js/state.js`, `js/dom.js`, `js/ui/modal.js`, `js/ui/render.js`, `js/flow/quiz.js` (nuevos)
- `index.html` (botón «Imprimir», atributos ARIA del paginador)
- `css/styles.css` (ajustes de contraste si procede, `@media print`, estilos del paginador)
- `tests/cu-05/`, `tests/cu-08/` (nuevos casos de lógica pura)
- `AGENTS.md` y `MEMORY.md` (estructura y bitácora)

**Fuera de alcance:**
- 1.2 (compacidad de snapshots con banco versionado), 3.3 (redacción de las 300 explicaciones), 7.1 (tests de integración DOM con `jsdom`) y 8.1 (PWA).
- Cualquier cambio en las claves de `localStorage` o en el esquema del banco.
- Reescritura de intentos ya guardados.

## 4. Requisitos funcionales

### Cuota e historial (1.1)

- **RF-01** `storage.js` expone `HISTORY_LIMIT = 50` y `getHistoryLength()`, que devuelve el número de entradas del historial crudo sin lanzar.
- **RF-02** `Storage.saveAttempt(attempt, { rotate })` añade el intento al principio; si `rotate` es `true` y el historial supera `HISTORY_LIMIT`, elimina la entrada más antigua *representable* antes de escribir.
- **RF-03** `finishQuiz()` comprueba el tamaño antes de guardar. Si al guardar se superaría `HISTORY_LIMIT`, muestra el modal propio con el texto normativo («Historial completo») indicando qué intento se eliminará; solo al confirmar se guarda con rotación.
- **RF-04** Si el usuario cancela, el resultado se muestra igualmente en pantalla, no se escribe nada y se informa de que el intento no se ha guardado.
- **RF-05** Ninguna ruta borra entradas del historial sin confirmación explícita (principio 5 de la constitución).

### Contraste (2.4)

- **RF-06** Se auditan los pares texto/fondo de la paleta (`--tinta`, `--tinta-suave`, `--pendiente`, `--acierto`, `--error`, textos del cabecero) sobre sus fondos reales y se registran los ratios medidos en `MEMORY.md`.
- **RF-07** Todo par usado en texto de tamaño normal (< 18.66 px o < 14 px en negrita) que quede por debajo de 4.5:1 se corrige ajustando la variable CSS existente, sin introducir colores literales nuevos.
- **RF-08** Si la auditoría confirma que todos los pares cumplen AA, no se modifica el CSS y se registra la conclusión.

### Finalización (3.2)

- **RF-09** En la última pregunta solo queda visible un control de finalización: `#btn-finish-quiz` se oculta con `hidden` y `#btn-next-q` muestra «Finalizar test».
- **RF-10** Al retroceder desde la última pregunta, `#btn-finish-quiz` vuelve a mostrarse.
- **RF-11** Si `#btn-finish-quiz` tiene el foco cuando se oculta, el foco se mueve a `#btn-next-q` para no perderlo.

### Historial paginado (3.4)

- **RF-12** `engine.js` expone `paginate(list, page, pageSize)` puro, que devuelve `{ items, page, pageSize, total, totalPages, hasMore, remaining }` y tolera entradas inválidas.
- **RF-13** La pantalla de historial muestra `HISTORY_PAGE_SIZE = 10` intentos por página y un botón «Cargar más» que añade la siguiente página sin re-pintar las anteriores.
- **RF-14** El botón indica los intentos restantes («Cargar más (12 restantes)») y se oculta cuando no quedan más.
- **RF-15** El recuento de intentos visibles se anuncia con `aria-live="polite"`.
- **RF-16** Las acciones «Ver» y «Eliminar» siguen funcionando en todas las páginas, incluidas las añadidas dinámicamente.

### Impresión (3.5)

- **RF-17** La pantalla de resultados incluye un botón «Imprimir» que invoca `window.print()`.
- **RF-18** `@media print` oculta cabecero, pie, navegación, barra de herramientas, botones y modal, y muestra únicamente la cabecera de resultados, las métricas y la corrección detallada.
- **RF-19** La corrección impresa es legible en blanco y negro: las marcas de correcta/incorrecta/sin responder no dependen solo del color.
- **RF-20** El botón «Imprimir» no aparece en la vista impresa.

### Mantenibilidad (6.1–6.4)

- **RF-21** `app.js` se reduce a arranque y registro de listeners; el estado, el modal, el renderizado y el flujo de examen viven en módulos propios.
- **RF-22** `js/state.js` exporta el único objeto `state` mutable; ningún otro módulo declara estado global propio.
- **RF-23** `js/dom.js` centraliza `SCREENS`, los identificadores/selectores repetidos y `OPTION_PREFIXES` con el helper `optionPrefix(index)`.
- **RF-24** `js/ui/modal.js` exporta `showModal`, `closeModal` y `showStorageError`; conserva el comportamiento actual (foco, `inert`, `Escape`, trampa de foco).
- **RF-25** `js/ui/render.js` exporta `renderQuestion`, `renderResults`, `renderLastAttempt`, `renderHistoryScreen`.
- **RF-26** `js/flow/quiz.js` exporta el flujo de examen (`startQuiz`, `handleStartQuiz`, `navigate`, `finishQuiz`, `returnHome`, temporizador y persistencia).
- **RF-27** El grafo de dependencias es acíclico: `state` ← `engine`/`storage`; `dom` ← nada; `ui/*` ← `state`, `dom`, `engine`; `flow/*` ← `state`, `dom`, `engine`, `storage`, `ui/*`; `app` ← `flow/*`, `ui/*`, `dom`.
- **RF-28** `index.html` sigue cargando un único punto de entrada: `<script type="module" src="js/app.js">`.
- **RF-29** Las funciones públicas exportadas de `engine.js` y `storage.js` tienen JSDoc con `@param` y `@returns`.
- **RF-30** El refactor no cambia ningún comportamiento observable ni ningún texto de interfaz.

### Tests (7.2)

- **RF-31** Se verifica que el test de `buildQuiz` con `count` inválido existe y pasa (heredado de 008).
- **RF-32** Se añaden tests de `paginate` (páginas completas, última página parcial, `page` fuera de rango, `pageSize` inválido, lista vacía, entrada no array).
- **RF-33** Se añaden tests del límite de historial en `storage.js` (rotación activa, rotación desactivada, conservación de entradas inválidas del crudo, `getHistoryLength`).

## 5. Requisitos no funcionales

- **RNF-01** Sin dependencias nuevas, sin build step y sin peticiones de red (principios 1 y 5 de la constitución).
- **RNF-02** Lógica pura separada de la interfaz; los módulos con DOM no se importan en los tests (principio 3).
- **RNF-03** `npm test` en verde en todo momento; los tests existentes no se debilitan.
- **RNF-04** Interfaz, comentarios y documentación en español; identificadores en inglés (principio 6).
- **RNF-05** Todo contenido dinámico insertado con `innerHTML` pasa por `escapeHTML()`.
- **RNF-06** Verificación manual con Chrome DevTools: flujo completo, consola limpia, vista a 375 px y previsualización de impresión.
- **RNF-07** `AGENTS.md` (estructura) y `MEMORY.md` (decisiones y bitácora) actualizados al cerrar el spec.

## 6. Criterios de aceptación

- **CA-01** Con 50 intentos guardados, al finalizar el 51.º aparece el modal «Historial completo» nombrando el intento que se eliminará; confirmar guarda el nuevo y elimina el más antiguo; cancelar muestra el resultado sin escribir nada.
- **CA-02** Tras la rotación, `getHistory().length === HISTORY_LIMIT` y el intento eliminado es el más antiguo.
- **CA-03** `MEMORY.md` registra los ratios de contraste medidos; si alguno era < 4.5:1 en texto normal, la variable corregida alcanza ≥ 4.5:1.
- **CA-04** En la última pregunta solo hay un control «Finalizar test» visible; al volver a la anterior reaparece el de la barra; el foco nunca queda en un elemento oculto.
- **CA-05** Con 25 intentos, el historial muestra 10 y «Cargar más (15 restantes)»; tras dos pulsaciones muestra los 25 y el botón desaparece.
- **CA-06** «Ver» y «Eliminar» funcionan en la tercera página cargada dinámicamente.
- **CA-07** `paginate` cumple los casos de RF-32 sin lanzar.
- **CA-08** Al pulsar «Imprimir», la previsualización muestra solo resultados y corrección, sin cabecero, pie, botones ni modal, y legible en escala de grises.
- **CA-09** `js/app.js` queda por debajo de 200 líneas y solo contiene arranque y bindings; existen `js/state.js`, `js/dom.js`, `js/ui/modal.js`, `js/ui/render.js` y `js/flow/quiz.js`.
- **CA-10** El flujo completo (iniciar → responder → navegar → finalizar → resultados → historial → recuperación tras recarga) se comporta igual que antes del refactor; consola sin errores.
- **CA-11** No queda ningún array `prefixes` duplicado ni ningún literal de pantalla sin constante.
- **CA-12** Todas las funciones públicas exportadas de `engine.js` y `storage.js` tienen JSDoc.
- **CA-13** `npm test` en verde con los tests nuevos (RF-31 a RF-33) y sin regresiones.
- **CA-14** `AGENTS.md` refleja la nueva estructura de `js/` y `MEMORY.md` tiene entrada fechada y línea de bitácora.

## 7. Restricciones y dependencias

- **Constitución v1.0.0**: principios 1 (stack mínimo), 2 (spec y código acoplados), 3 (lógica e interfaz separadas), 4 (verificación sin dependencias), 5 (datos protegidos, ningún borrado sin confirmación) y 6 (idioma).
- **Dependencia del spec 008**: `buildQuiz`/`scoreQuiz` ya validados, `pluralize` importado en la capa de interfaz, CSP activa en `index.html` (la CSP no bloquea módulos locales del mismo origen).
- **Contrato de datos**: las claves `scs_alias`, `scs_history` y `scs_active` no cambian.
- **Inmutabilidad del historial**: los intentos guardados no se reescriben; la rotación solo elimina la entrada más antigua y con confirmación.
- **Tests**: `node --test` no puede importar módulos que toquen `document`; por eso `state.js`, `dom.js`, `ui/*` y `flow/*` quedan fuera de los tests unitarios y se verifican manualmente.
- **Orden de trabajo**: el refactor 6.1 debe hacerse por módulos y verificarse tras cada extracción; los cambios de UX (3.2, 3.4, 3.5) se aplican sobre la estructura ya dividida para evitar conflictos.
