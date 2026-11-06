# Plan 009 — Mejoras medias

## 1. Arquitectura y diseño técnico

El spec no cambia el modelo de aplicación (SPA sin build, una página, cuatro pantallas, `localStorage`). Introduce dos tipos de cambio:

1. **Cambios de comportamiento acotados** (cuota, finalización, paginación, impresión) sobre los módulos existentes.
2. **Un refactor estructural** (6.1–6.3) que divide `app.js` en módulos por responsabilidad usando ES modules nativos, sin bundler.

Orden elegido: primero la lógica pura y sus tests, después los cambios de comportamiento sobre la estructura actual, y por último el refactor de módulos. Así cada paso es verificable por separado y el refactor se hace sobre código ya estable, sin mezclar cambios funcionales con movimientos de código.

### 1.1 Estructura final de `js/`

```
js/
  app.js            # Arranque: DOMContentLoaded + registro de listeners (< 200 líneas)
  state.js          # Único objeto `state` mutable (exportado)
  dom.js            # Constantes: SCREENS, IDS, OPTION_PREFIXES, helpers de selección
  engine.js         # Lógica pura (sin cambios de responsabilidad; + paginate, + JSDoc)
  storage.js        # Wrapper de localStorage (+ HISTORY_LIMIT, getHistoryLength, rotate)
  questions.js      # Banco de preguntas (intacto)
  ui/
    modal.js        # showModal / closeModal / showStorageError + trampa de foco
    render.js       # renderQuestion / renderResults / renderLastAttempt / renderHistoryScreen
  flow/
    quiz.js         # startQuiz / handleStartQuiz / navigate / finishQuiz / returnHome / timer
```

Grafo de dependencias (acíclico, RF-27):

```
engine.js      → (nada)
storage.js     → engine.js
state.js       → (nada)
dom.js         → (nada)
ui/modal.js    → engine.js, dom.js
ui/render.js   → engine.js, storage.js, state.js, dom.js, ui/modal.js
flow/quiz.js   → engine.js, storage.js, state.js, dom.js, ui/modal.js, ui/render.js
app.js         → state.js, dom.js, engine.js, storage.js, ui/modal.js, ui/render.js, flow/quiz.js, questions.js
```

Regla: ningún módulo de `ui/` o `flow/` importa `app.js`. El estado compartido vive solo en `state.js`.

### 1.2 Por qué `state.js` y no inyección por parámetro

Se descarta pasar `state` como parámetro a cada función de render (obligaría a cambiar todas las firmas y a reordenar el flujo). Se descarta también un patrón observador/pub-sub (añade complejidad sin framework reactivo y contradice el principio de simplicidad). Se exporta el objeto mutable desde `state.js`: es el mismo modelo actual, pero con una única fuente de verdad importable y sin estado global disperso.

## 2. Solución propuesta

### 2.1 Cuota de `localStorage` (RF-01 … RF-05)

**`storage.js`**

```js
export const HISTORY_LIMIT = 50;

// Longitud del historial crudo (incluye entradas inválidas), sin lanzar.
getHistoryLength: () => Storage.readRawHistory().length,

// `rotate` permite eliminar la entrada más antigua al superar el límite.
saveAttempt: (attempt, { rotate = false } = {}) => {
    const history = Storage.readRawHistory();
    history.unshift(attempt);
    if (rotate && history.length > HISTORY_LIMIT) {
        // Se elimina la última entrada representable, no necesariamente la última posición:
        // el crudo puede contener entradas inválidas (null, objetos corruptos) que se conservan.
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i] && typeof history[i] === 'object') {
                history.splice(i, 1);
                break;
            }
        }
    }
    return writeJSON(KEYS.HISTORY, history);
}
```

Decisión: la rotación elimina la **última entrada representable** del array crudo. Las entradas inválidas (`null`, basura) se conservan, igual que hacen `saveAttempt`/`deleteAttempt` hoy (decisión de 004: no reescribir el crudo).

**`flow/quiz.js` — `finishQuiz()`**

```js
const HISTORY_FULL_TITLE = 'Historial completo';

const finishQuiz = () => {
    const pending = countPending();          // total - respondidas
    const processFinish = () => persistAndShow({ rotate: false });

    if (pending > 0) {
        showModal('Preguntas pendientes', pendingMessage(pending), processFinish);
        return;
    }
    processFinish();
};

// Si el historial ya está en el límite, pide confirmación antes de rotar.
const persistAndShow = ({ rotate }) => {
    stopTimer();
    const willRotate = Storage.getHistoryLength() >= HISTORY_LIMIT;

    if (willRotate && !rotate) {
        const oldest = describeOldestAttempt();     // «el intento del 3/11/2026 (45,00 %)»
        showModal(
            HISTORY_FULL_TITLE,
            `El historial ha alcanzado el máximo de ${HISTORY_LIMIT} intentos. ` +
            `Para guardar este simulacro se eliminará ${oldest}. ¿Deseas continuar?`,
            () => persistAndShow({ rotate: true })
        );
        return;
    }

    const activeCleared = Storage.clearActiveQuiz();
    const attempt = createAttempt({ ... });
    const saved = Storage.saveAttempt(attempt, { rotate: willRotate });

    renderResults(attempt);          // El resultado se muestra siempre, se guarde o no
    if (!saved) showStorageError('No se pudo guardar', NOT_SAVED_MESSAGE);
    else if (willRotate) showStorageError('Intento no guardado', CANCELLED_MESSAGE); // ruta de cancelación
    ...
};
```

Ajuste sobre el pseudocódigo anterior: la **cancelación** (RF-04) se resuelve sin escribir nada. Como `showModal` solo expone `onConfirm`, se añade un `onCancel` opcional (ver §2.6) para mostrar el resultado con el aviso «No se ha guardado» sin tocar `localStorage`.

Textos normativos (en español, sin emojis):

| Constante | Texto |
| --- | --- |
| `HISTORY_FULL_TITLE` | `Historial completo` |
| `HISTORY_FULL_MESSAGE` | `El historial ha alcanzado el máximo de {HISTORY_LIMIT} intentos. Para guardar este simulacro se eliminará {oldest}. ¿Deseas continuar?` |
| `NOT_SAVED_MESSAGE` | `El intento no se ha guardado porque el historial está completo. Puedes ver el resultado ahora, pero se perderá al salir de esta pantalla.` |

`describeOldestAttempt()` compone la descripción con `formatDate()` y `formatPct()` desde `getHistory()[length-1]`; si el historial crudo no tiene ninguna entrada representable, devuelve «la entrada más antigua».

### 2.2 Auditoría de contraste (RF-06 … RF-08)

Procedimiento, sin dependencias externas:

1. Extraer de `css/styles.css` los pares texto/fondo reales: para cada regla con `color:`, resolver el `background-color` efectivo del contenedor.
2. Calcular el ratio con la fórmula WCAG 2.1 (luminancia relativa + `(L1 + 0.05) / (L2 + 0.05)`) mediante un script Node temporal fuera del repo (no se añade al proyecto).
3. Clasificar por tamaño: texto normal (< 18.66 px, o < 14 px sin negrita) exige 4.5:1; texto grande exige 3:1.
4. Registrar la tabla de ratios en `MEMORY.md` (sección «Aprendizajes y trampas»).
5. Corregir solo los pares que incumplan, ajustando la variable CSS existente (`--tinta-suave`, `--pendiente`, …), nunca añadiendo colores literales.

Mediciones ya realizadas sobre la paleta actual (punto de partida):

| Par | Ratio | Umbral | Resultado |
| --- | --- | --- | --- |
| `--tinta-suave` #566C82 / `--papel` #FFFFFF | 5.44:1 | 4.5:1 | Cumple AA |
| `--tinta-suave` #566C82 / `--azul-papel` #F2F7FB | 5.04:1 | 4.5:1 | Cumple AA |
| `--acierto` #146B52 / `--acierto-bg` #E4F2ED | 5.93:1 | 4.5:1 | Cumple AA |
| `--error` #A32620 / `--error-bg` #FAE9E7 | 6.26:1 | 4.5:1 | Cumple AA |
| `--pendiente` #8A5A12 / `--pendiente-bg` #FBF1DF | 5.28:1 | 4.5:1 | Cumple AA |
| `#9DBEDC` / `--azul-noche` #072A47 (cabecero) | 7.57:1 | 4.5:1 | Cumple AA |
| `#A9C7E2` / `--azul-noche` #072A47 (cabecero) | 8.35:1 | 4.5:1 | Cumple AA |

**Corrección del informe**: la cifra de 4.4:1 que motivó el punto 2.4 es errónea. La expectativa realista de este requisito es que la auditoría completa (21 usos de `--tinta-suave` + estados de botón, `disabled`, focos y badges) confirme el cumplimiento y quede registrada; si aparece algún fallo puntual (p. ej. un `disabled` sobre fondo claro), se corrige la variable correspondiente.

### 2.3 Controles de finalización (RF-09 … RF-11)

En `renderQuestion()`, al final del pintado:

```js
const isLast = state.currentIndex === total - 1;
const finishBtn = document.getElementById(IDS.BTN_FINISH_QUIZ);
const nextBtn = document.getElementById(IDS.BTN_NEXT_Q);

nextBtn.textContent = isLast ? 'Finalizar test' : 'Siguiente';

// Si el botón de la barra tiene el foco y va a ocultarse, el foco pasa al siguiente.
if (isLast && document.activeElement === finishBtn) {
    nextBtn.focus({ preventScroll: true });
}
finishBtn.hidden = isLast;
```

`#btn-finish-quiz` se oculta con el atributo `hidden`, que ya está neutralizado en CSS por `[hidden] { display: none !important; }`. Al retroceder, `isLast` es `false` y el botón reaparece; no se pierde el listener porque el elemento no se recrea.

### 2.4 Historial paginado (RF-12 … RF-16)

**Lógica pura en `engine.js`**

```js
export const HISTORY_PAGE_SIZE = 10;

/**
 * Pagina una lista sin mutarla. `page` es 1-based y se recorta al rango válido.
 * @param {unknown[]} list
 * @param {number} page
 * @param {number} pageSize
 * @returns {{items: unknown[], page: number, pageSize: number, total: number,
 *            totalPages: number, hasMore: boolean, remaining: number}}
 */
export const paginate = (list, page = 1, pageSize = HISTORY_PAGE_SIZE) => {
    const items = Array.isArray(list) ? list : [];
    const total = items.length;
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : HISTORY_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const current = Number.isInteger(page)
        ? Math.min(Math.max(page, 1), totalPages)
        : 1;
    const start = (current - 1) * size;
    const slice = items.slice(start, start + size);

    return {
        items: slice,
        page: current,
        pageSize: size,
        total,
        totalPages,
        hasMore: current < totalPages,
        remaining: Math.max(0, total - current * size)
    };
};
```

**Renderizado incremental en `ui/render.js`**

`renderHistoryScreen()` pasa a gestionar una página visible:

```js
let historyPage = 1;   // estado de vista local del módulo de render

const renderHistoryScreen = () => {
    historyPage = 1;
    const history = Storage.getHistory();
    const container = document.getElementById(IDS.HISTORY_LIST);

    if (!history.length) { /* estado vacío + switchScreen(SCREENS.HISTORY) */ return; }

    container.innerHTML = '';
    container.appendChild(buildHistoryList(history));   // <ol> con las tarjetas
    container.appendChild(buildHistoryFooter(history)); // recuento + «Cargar más»
    attachHistoryActions(container, history);           // delegación de eventos (una sola vez)
    switchScreen(SCREENS.HISTORY);
};

const loadMoreHistory = () => {
    const history = Storage.getHistory();
    historyPage += 1;
    const { items } = paginate(history, historyPage, HISTORY_PAGE_SIZE);
    appendHistoryCards(items);        // añade sin re-pintar lo anterior
    updateHistoryFooter(history);     // actualiza recuento y visibilidad del botón
};
```

Decisión de diseño: los listeners de «Ver»/«Eliminar» se registran **una sola vez sobre el contenedor** con delegación (`event.target.closest('.btn-view')`). Esto resuelve a la vez RF-16 (funcionan en páginas añadidas dinámicamente) y refuerza el 4.3 de 008 (el clic ya no depende de `dataset` del nodo exacto). Se usa `closest()` y se lee `dataset.id` del botón encontrado.

Pie de historial:

```html
<p class="history-count" aria-live="polite">Mostrando 10 de 25 intentos</p>
<button id="btn-load-more-history" class="btn btn-secondary w-full">Cargar más (15 restantes)</button>
```

El texto usa `pluralize()` (ya exportado por `engine.js`). El botón se oculta con `hidden` cuando `hasMore` es `false`. Tras eliminar un intento se reinicia `historyPage = 1` y se re-pinta, para que el recuento no quede desincronizado.

### 2.5 Impresión de resultados (RF-17 … RF-20)

**HTML** — en `.actions-row` de `#screen-results`:

```html
<button id="btn-print-results" class="btn btn-secondary">Imprimir</button>
```

**JS** — en `app.js` (binding fijo, como el resto de botones estáticos):

```js
document.getElementById(IDS.BTN_PRINT_RESULTS).addEventListener('click', () => window.print());
```

**CSS** — bloque `@media print` al final de `styles.css`:

```css
@media print {
    header, footer,
    .quiz-bar, .quiz-nav, .actions-row,
    #recovery-banner, #custom-modal,
    .history-actions, #btn-load-more-history, .history-count { display: none !important; }

    body { background: #fff; color: #000; }
    main { max-width: none; padding: 0; }
    .screen { display: block !important; }          /* solo está activa la de resultados */
    .results-score, .stat-val { color: #000; }
    .review-item { break-inside: avoid; page-break-inside: avoid; }
    .status-badge { border: 1px solid #000; }
}
```

Legibilidad en blanco y negro (RF-19): las badges ya llevan texto («Correcta», «Incorrecta», «Sin responder») y cada opción marcada añade la etiqueta «Respuesta correcta» / «Tu respuesta», así que la información no depende solo del color. Se refuerza con borde impreso en `.status-badge`.

`window.print()` es una API nativa del navegador, sin red ni dependencias: no requiere enmienda a la constitución.

### 2.6 `onCancel` opcional en el modal (soporte de RF-04)

`showModal(title, msg, onConfirm, onCancel = null)` añade un callback opcional que se invoca al cancelar (botón «Cancelar» o `Escape`). `closeModal` lo consume y lo limpia junto a `modalConfirmHandler`. Los cinco puntos de llamada actuales siguen pasando tres argumentos: el cambio es retrocompatible y no altera su comportamiento.

### 2.7 Refactor de módulos (RF-21 … RF-30)

Secuencia de extracción, una por commit y verificada antes de seguir:

| Paso | Se extrae a | Contenido |
| --- | --- | --- |
| 1 | `js/dom.js` | `SCREENS`, `IDS`, `BACKGROUND_REGIONS`, `OPTION_PREFIXES`, `optionPrefix()`, `byId()` |
| 2 | `js/state.js` | Objeto `state` |
| 3 | `js/ui/modal.js` | `applyBackgroundInert`, `focusActiveScreen`, `isVisible`, `switchScreen`, `modalKeydownHandler`, `closeModal`, `showModal`, `showStorageError`, `modalTrigger`, `modalConfirmHandler`, `supportsInert` |
| 4 | `js/ui/render.js` | `renderQuestion`, `renderResults`, `renderLastAttempt`, `renderHistoryScreen`, `returnHome`, `historyPage` |
| 5 | `js/flow/quiz.js` | `startTimer`, `stopTimer`, `saveActiveQuizNow`, `persistActiveQuiz`, `navigate`, `confirmDiscardActiveQuiz`, `handleStartQuiz`, `startQuiz`, `finishQuiz` |
| 6 | `js/app.js` | Solo `DOMContentLoaded`: carga de alias, banner de recuperación y registro de listeners |

Notas de implementación:

- `switchScreen` vive en `ui/modal.js` porque gestiona el foco de pantalla, que es la misma maquinaria que el modal usa al cerrar. Si durante la extracción se comprueba que `render.js` lo necesita sin relación con el modal, se mueve a `dom.js`; la decisión se registra en `MEMORY.md`.
- `render.js` importa `flow/quiz.js`? **No**: `renderLastAttempt()` y `renderHistoryScreen()` llaman a `renderResults()`, que está en el mismo módulo. Los callbacks que necesitan flujo (`startQuiz`, `finishQuiz`, `navigate`) se registran en `app.js`, que importa ambos módulos. Esto mantiene el grafo acíclico.
- Los listeners de elementos estáticos siguen registrándose una sola vez en `DOMContentLoaded`; los de elementos dinámicos continúan enganchándose tras insertarlos (convención de `AGENTS.md`).
- `escapeHTML()` sigue aplicándose a todo texto dinámico insertado con `innerHTML`.
- Comentario de cabecera en cada módulo nuevo indicando su responsabilidad, en español.

### 2.8 JSDoc (RF-29)

Bloques JSDoc en todas las funciones exportadas de `engine.js` y `storage.js`, con descripción en español, `@param {tipo} nombre` y `@returns {tipo}`. Sin cambio de comportamiento; se verifica que `npm test` sigue en verde.

## 3. Componentes y responsabilidades

| Componente | Responsabilidad | No hace |
| --- | --- | --- |
| `engine.js` | Lógica pura: validación, paginación, puntuación, formato | DOM, `localStorage`, estado |
| `storage.js` | Acceso a `localStorage`, lectura/escritura defensiva, límite de historial | Render, decisiones de UX |
| `state.js` | Objeto `state` mutable único | Lógica, render |
| `dom.js` | Constantes de identificadores, pantallas y prefijos; acceso a nodos | Estado, eventos |
| `ui/modal.js` | Diálogo, foco, `inert`, `Escape`, cambio de pantalla | Estado del examen |
| `ui/render.js` | Pintado de pregunta, resultados, último intento e historial paginado | Persistencia, temporizador |
| `flow/quiz.js` | Ciclo de vida del examen: arranque, navegación, temporizador, finalizado, persistencia | Pintado directo |
| `app.js` | Arranque y registro de listeners | Lógica de negocio, render |

## 4. Tecnologías y decisiones técnicas

- **ES modules nativos** para la división de `app.js`: sin bundler, el navegador resuelve los imports. Se sirve por HTTP (ya es requisito del proyecto).
- **Límite por número de intentos (50), no por bytes**: medible, determinista y testeable sin depender de la cuota real del navegador. Se descarta estimar bytes con `JSON.stringify` como criterio principal (coste en cada guardado y umbral arbitrario), aunque `writeJSON` sigue capturando el fallo real de cuota.
- **Rotación con confirmación**: se descarta el recorte automático por violar el principio 5 («ningún borrado sin confirmación»).
- **Paginación incremental («Cargar más») en lugar de paginación clásica**: evita re-pintar y perder el foco, y encaja con una lista cronológica que se consulta de arriba abajo.
- **Delegación de eventos en el historial**: un único listener por acción sobre el contenedor, compatible con páginas añadidas dinámicamente.
- **`window.print()` + `@media print`**: exportación sin dependencias ni red. Se descarta generar PDF en cliente (requeriría una librería).
- **Auditoría de contraste con script externo temporal**: no se añade ninguna dependencia al repo; el resultado (la tabla de ratios) sí se registra en `MEMORY.md`.

## 5. Fases de implementación

### Fase A — Lógica pura y tests (TDD)
1. Tests de `paginate` (fallan por exportación ausente).
2. Tests de `HISTORY_LIMIT`, `getHistoryLength` y `saveAttempt(attempt, { rotate })`.
3. Implementar `paginate` y `HISTORY_PAGE_SIZE` en `engine.js`.
4. Implementar límite y rotación en `storage.js`.
5. `npm test` en verde.

### Fase B — Contraste (2.4)
6. Auditoría completa de pares texto/fondo y cálculo de ratios.
7. Correcciones mínimas en `css/styles.css` solo si hay incumplimientos.
8. Registro de la tabla de ratios en `MEMORY.md`.

### Fase C — Cambios de comportamiento (1.1 UI, 3.2, 3.4, 3.5)
9. `onCancel` opcional en `showModal`.
10. Confirmación de historial completo en `finishQuiz`.
11. Ocultar `#btn-finish-quiz` en la última pregunta con gestión de foco.
12. Historial paginado con delegación de eventos.
13. Botón «Imprimir» + `@media print`.
14. Verificación manual intermedia en Chrome DevTools.

### Fase D — Refactor de módulos (6.1–6.3)
15. Extracciones 1–6 de §2.7, una por commit, con verificación tras cada una.
16. Sustitución de literales por `SCREENS`/`IDS` y de `prefixes` por `OPTION_PREFIXES`.
17. Comprobación de que `app.js` queda por debajo de 200 líneas y el grafo es acíclico.

### Fase E — Documentación (6.4) y cierre
18. JSDoc en `engine.js` y `storage.js`.
19. Actualización de `AGENTS.md` (estructura de `js/`) y `MEMORY.md` (decisiones, aprendizajes, bitácora).
20. `npm test` final + verificación manual completa (flujo, consola, 375 px, impresión).
21. Marcado de tareas en `tasks.md`.

## 6. Estrategia de tests y verificación

- **Unitarios (`node --test`)**: `paginate` (7 casos), límite/rotación de historial (5 casos), no regresión de los 109 existentes. Los módulos con DOM quedan excluidos por restricción del runner.
- **Manual con Chrome DevTools** (obligatorio, principio 4):
  - Historial completo: sembrar 50 intentos por `localStorage` y finalizar uno más; confirmar y cancelar.
  - Última pregunta: un solo control de finalización; retroceder y comprobar que reaparece; foco correcto.
  - Historial paginado: 25 intentos → 10 + «Cargar más (15 restantes)»; cargar todo; eliminar en la tercera página.
  - Impresión: previsualización solo con resultados y corrección; escala de grises legible.
  - Refactor: flujo completo idéntico al previo, consola sin errores ni avisos de módulos, recuperación tras recarga.
  - Vista a 375 px en las cuatro pantallas y en el modal, sin desbordamiento horizontal.
- **Estática**: recuento de líneas de `app.js`, ausencia de `prefixes` duplicados y de literales de pantalla.
