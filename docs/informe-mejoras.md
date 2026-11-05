# Informe de mejoras — scs-quiz

Fecha: 2026-11-05

Revisión del código (HTML, CSS, JS, tests, datos, docs) y del estado registrado en `MEMORY.md`. Los tests pasan (107/107) y el flujo manual a 375 px no presenta desbordamiento. Las mejoras se agrupan por impacto y esfuerzo; ninguna rompe la constitución salvo las marcadas como «requiere enmienda».

## Resumen ejecutivo

- **Fortalezas**: arquitectura limpia (lógica pura separada), persistencia defensiva, accesibilidad del modal ya muy cuidada, 107 tests, sin dependencias.
- **Deuda principal vigente** (según `MEMORY.md`): control de cuota de `localStorage`, ausencia de tests de integración DOM y de validación automática del banco.
- **Oportunidades de mayor retorno**: cuota de almacenamiento, navegación por teclado en el radiogrupo, warning de salida y tests de integridad del banco.

---

## 1. Almacenamiento y rendimiento

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 1.1 | **Control de cuota de `localStorage`**: limitar el historial (p. ej. 50 intentos) o avisar antes de guardar cuando se acerque al límite; `writeJSON` ya devuelve `false`, pero la UI solo reacciona tras el fallo. | `storage.js`, `app.js` | Medio |
| 1.2 | **Compacidad de snapshots**: los intentos guardan el cuestionario completo. El ahorro real vendría de guardar solo IDs de pregunta + respuestas y reconstruir desde el banco versionado (rompe inmutabilidad histórica: requiere migración/versionado del banco). | `engine.js` (`createAttempt`), `storage.js` | Alto |
| 1.3 | **`buildQuiz` valida `count`**: `parseInt('abc')` → `NaN` y `slice(0, NaN)` devuelve vacío. Añadir guardia que caiga al banco completo o a un valor por defecto. | `engine.js:buildQuiz` | Bajo |
| 1.4 | **Tamaño de `questions.js` (7 802 líneas)**: no es bloqueante; el coste de red es local. | — | — |

## 2. Accesibilidad

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 2.1 | **Navegación por flechas en el radiogrupo**: hoy solo `Enter`/`Espacio`. Un grupo `role="radiogroup"` debería moverse con `ArrowUp/Down` (o `Left/Right`) entre opciones. | `app.js:renderQuestion` | Bajo |
| 2.2 | **`aria-live` en el enunciado**: el contador ya es `aria-live="polite"`; el enunciado (`#question-statement`) no. Añadir `aria-live="polite"` al contenedor de pregunta. | `index.html`, `app.js` | Bajo |
| 2.3 | **`prefers-reduced-motion`**: la animación `screen-in` y transiciones no se desactivan. Añadir `@media (prefers-reduced-motion: reduce) { .screen.active { animation: none; } }`. | `css/styles.css` | Bajo |
| 2.4 | **Contraste de `--tinta-suave` (#566C82)**: sobre blanco ronda 4.4:1; justo por debajo de AA para texto normal. Oscurecer a `#4A5F75` o reservar para texto grande. | `css/styles.css` | Bajo |
| 2.5 | **Foco tras clic en opción**: el manejador de clic llama a `renderQuestion()` sin `focusOptionIndex`, perdiendo el foco. Pasar `idx`. | `app.js:renderQuestion` (click) | Bajo |
| 2.6 | **Enlace «saltar al contenido»** y etiquetas de región (`aria-labelledby` en `main`/`section`). | `index.html` | Bajo |
| 2.7 | **`escapeHTML` robusto**: añadir escape de comilla simple y backtick por si se usa en atributo con comillas simples. | `engine.js:escapeHTML` | Bajo |

## 3. Experiencia de usuario

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 3.1 | **Aviso al cerrar/recargar con examen en curso**: `beforeunload` solo si `isQuizInProgress`. | `app.js` | Bajo |
| 3.2 | **Botones de finalización duplicados**: en la última pregunta conviven «Siguiente» (que pasa a «Finalizar test») y «Finalizar test» de la barra. Unificar o deshabilitar uno. | `app.js:renderQuestion` | Bajo |
| 3.3 | **Explanaciones vacías en los 300 ítems**: el campo `explanation` existe pero está vacío en todo el banco. Completar (trabajo de datos) u ocultar el bloque. | `questions.js`, `app.js:renderResults` | Medio/Alto |
| 3.4 | **Historial sin límite**: paginación o «cargar más» y límite visual. | `app.js:renderHistoryScreen` | Medio |
| 3.5 | **Exportar/imprimir resultado**: botón «Imprimir» con `window.print()` y CSS `@media print`. | `index.html`, `css/styles.css` | Medio |
| 3.6 | **`inputmode`/`autocorrect` en alias**: añadir `autocorrect="off"`. | `index.html` | Bajo |

## 4. Robustez y validación

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 4.1 | **Test de integridad del banco**: verificar IDs únicos y con formato `SCS-RAD-NNN`, `correctOption` existente, 4–5 opciones, sin duplicados de opción, UTF-8. | `tests/banco.test.js` (nuevo) | Bajo |
| 4.2 | **`pluralize` ya disponible**: `finishQuiz` construye manualmente «1 pregunta sin responder» / «N preguntas…». Reusar `pluralize`. | `app.js:finishQuiz` | Bajo |
| 4.3 | **Manejador de clic en historial robusto**: `e.target.dataset.id` falla si el clic cae en un hijo del botón. Usar `e.currentTarget` o `closest('.btn-view')`. | `app.js:renderHistoryScreen` | Bajo |
| 4.4 | **`scoreQuiz` con banco vacío**: división por cero si `questions.length === 0`. Añadir guardia. | `engine.js:scoreQuiz` | Bajo |

## 5. Seguridad

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 5.1 | **Content-Security-Policy**: añadir `<meta http-equiv="Content-Security-Policy" ...>`. No hay scripts remotos, así que es viable. | `index.html` | Bajo |

## 6. Mantenibilidad

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 6.1 | **Dividir `app.js` (563 líneas)** en módulos por responsabilidad (modal, render, flujo) usando ES modules. | `js/` | Medio |
| 6.2 | **Constantes para IDs de pantalla** y selectores repetidos. | `app.js` | Bajo |
| 6.3 | **Eliminar duplicación de `prefixes`** (aparece en `renderQuestion` y `renderResults`). | constante compartida | Bajo |
| 6.4 | **JSDoc** en funciones públicas de `engine.js`/`storage.js`. | `js/*.js` | Bajo |
| 6.5 | **Formateo/lint opcional**: documentar un comando `npx eslint` sin añadirlo a `package.json`. | `AGENTS.md` | Bajo |

## 7. Tests

| # | Mejora | Dónde | Esfuerzo |
|---|--------|-------|----------|
| 7.1 | **Tests de integración DOM**: hoy solo lógica pura. Sin añadir dependencias es difícil; se podría usar un harness con `jsdom` vía `npx` (no en `package.json`) para smoke tests del flujo. Requiere acuerdo por la constitución. | `tests/` | Alto |
| 7.2 | **Test para `buildQuiz` con `count` inválido** tras 1.3. | `tests/cu-01` | Bajo |

## 8. PWA / instalabilidad (opcional)

| # | Mejora | Esfuerzo |
|---|--------|----------|
| 8.1 | **Manifest + Service Worker** para instalación y caché explícito. Requiere enmienda a la constitución (principio 1). | Alto |

## Priorización sugerida

1. **Rápidas y de alto valor**: 1.3, 2.1, 2.2, 2.3, 2.5, 3.1, 3.6, 4.2, 4.3, 4.4, 5.1.
2. **Medias**: 1.1, 2.4, 3.2, 3.4, 3.5, 6.1–6.4, 7.2.
3. **Grandes / requieren decisión**: 1.2, 3.3, 7.1, 8.1.

## Lo que NO se recomienda tocar

- Cambiar las claves de `localStorage` (contrato de datos).
- Reordenar opciones en tiempo de ejecución (decisión vigente desde 2026-11-02).
- Añadir frameworks/bundler/CDN (principio 1 de la constitución).
- Reescribir el historial antiguo (inmutabilidad acordada).
