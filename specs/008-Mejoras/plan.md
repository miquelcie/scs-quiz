# Plan 008 — Mejoras rápidas de robustez, accesibilidad y UX

## 1. Arquitectura y diseño técnico

No se introduce ningún componente nuevo ni se altera la estructura de pantallas. Los cambios son puntuales en cuatro archivos:

- `js/engine.js`: validación de `buildQuiz` y `scoreQuiz`.
- `js/app.js`: teclado en el radiogrupo, foco tras clic, `beforeunload`, pluralización y manejador de clic del historial.
- `index.html`: `aria-live` en el enunciado, `autocorrect="off"` en el alias, meta CSP.
- `css/styles.css`: `prefers-reduced-motion`.

La lógica pura permanece en `engine.js` y el render/eventos en `app.js`, conforme al principio 3 de la constitución.

## 2. Solución propuesta

### 2.1 `buildQuiz` (RF-01)

```js
export const buildQuiz = (bank, count, random = Math.random) => {
    if (!Array.isArray(bank) || bank.length === 0) return [];
    const shuffledBank = shuffle(bank, random);
    let actualCount;
    if (count === 'max') {
        actualCount = shuffledBank.length;
    } else {
        const parsed = Number.isInteger(count) ? count : parseInt(count, 10);
        actualCount = Number.isInteger(parsed) && parsed > 0
            ? Math.min(parsed, shuffledBank.length)
            : shuffledBank.length;
    }
    return shuffledBank.slice(0, actualCount).map(q => ({ ...q }));
};
```

Se conserva el comportamiento para entradas válidas (25/50/100/'max').

### 2.2 Teclado en el radiogrupo (RF-02)

En `renderQuestion`, añadir un manejador `keydown` por opción que, además de `Enter`/`Espacio`, gestione:

- `ArrowDown`/`ArrowRight`: foco a la siguiente opción (envolvimiento).
- `ArrowUp`/`ArrowLeft`: foco a la anterior.
- `Home`: primera opción.
- `End`: última opción.

Para no duplicar lógica, se calcula el índice destino y se llama a `container.children[target]?.focus()`. La selección sigue requiriendo `Enter`/`Espacio` (patrón ARIA de radiogroup con selección explícita, ya establecido).

### 2.3 `aria-live` en el enunciado (RF-03)

Añadir `aria-live="polite"` y `aria-atomic="true"` al elemento `#question-statement` en `index.html`. No requiere cambio en JS.

### 2.4 `prefers-reduced-motion` (RF-04)

En `css/styles.css`, al final del archivo:

```css
@media (prefers-reduced-motion: reduce) {
    .screen.active { animation: none; }
    * { transition-duration: 0.01ms !important; }
}
```

### 2.5 Foco tras clic (RF-05)

En el manejador `click` de la opción, pasar `idx` a `renderQuestion(idx)` en lugar de `renderQuestion()`.

### 2.6 `beforeunload` (RF-06)

Registrar en `DOMContentLoaded`:

```js
window.addEventListener('beforeunload', event => {
    if (!isQuizInProgress(state.questions, state.currentIndex)) return;
    event.preventDefault();
    event.returnValue = '';
});
```

### 2.7 Alias (RF-07)

Añadir `autocorrect="off"` al `<input id="input-alias">` en `index.html`.

### 2.8 Pluralización en `finishQuiz` (RF-08)

Sustituir:

```js
const pendingLabel = pending === 1 ? '1 pregunta sin responder' : `${pending} preguntas sin responder`;
```

por:

```js
const pendingLabel = `${pluralize(pending, 'pregunta sin responder', 'preguntas sin responder')}`;
```

Importar `pluralize` en `app.js`.

### 2.9 Manejador de clic del historial (RF-09)

Cambiar `e.target.dataset.id` por `e.currentTarget.dataset.id` (o `btn.closest('[data-id]')?.dataset.id`) en los manejadores de `.btn-view` y `.btn-del`.

### 2.10 `scoreQuiz` (RF-10)

```js
export const scoreQuiz = (questions, answers) => {
    if (!Array.isArray(questions) || questions.length === 0) {
        return { hits: 0, errors: 0, unanswered: 0, scorePct: 0 };
    }
    // ... resto sin cambios
};
```

### 2.11 CSP (RF-11)

Añadir en `<head>` de `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'">
```

`'unsafe-inline'` en `style-src` se mantiene porque `renderQuestion` asigna `style.width` inline al progreso; alternativa futura: usar clase CSS.

## 3. Fases de implementación

- **Fase 1 — Lógica pura**: `buildQuiz` y `scoreQuiz` + tests (RF-01, RF-10).
- **Fase 2 — HTML/CSS**: `aria-live`, `autocorrect`, CSP, `prefers-reduced-motion` (RF-03, RF-04, RF-07, RF-11).
- **Fase 3 — JS de interfaz**: teclado, foco, `beforeunload`, pluralización, manejador de clic (RF-02, RF-05, RF-06, RF-08, RF-09).
- **Fase 4 — Verificación**: `npm test`, Chrome DevTools (flujo, consola, 375 px).

## 4. Componentes y responsabilidades

| Componente | Responsabilidad |
|------------|-----------------|
| `engine.js` | Validación de entradas y cálculo puro. |
| `app.js` | Eventos, render, foco, persistencia. |
| `index.html` | Estructura, atributos ARIA, CSP. |
| `styles.css` | Presentación y movimiento reducido. |

## 5. Decisiones técnicas

- No se añaden dependencias (principio 1).
- `pluralize` se reusa, no se duplica.
- La CSP permite `'unsafe-inline'` solo en estilos por el progreso inline; se documenta como deuda menor.
- La navegación por flechas no cambia la selección automáticamente (se mantiene el patrón de selección explícita ya establecido y testeado).
