# MEMORY.md

Documento vivo con el contexto acumulado del proyecto: estado, decisiones, aprendizajes y deuda técnica. Complementa a `AGENTS.md` (que describe *cómo* trabajar); aquí se registra *qué* se ha decidido y *qué* se ha aprendido.

> **Protocolo:** este archivo debe actualizarse al terminar cada tarea relevante. Añadir entradas fechadas al final, no borrar decisiones anteriores (marcarlas como obsoletas si dejan de aplicar). Mantenerlo breve: hechos y decisiones, no volcados de código.

---

## Estado actual

| Dato | Valor |
| --- | --- |
| Rama | `hotfix_001` |
| Último commit | `104b1c6` — *Merge branch 'feature_cambio_diseño' into main* (2026-11-03) |
| Preguntas en el banco | 300 (`SCS-RAD-001` … `SCS-RAD-300`) |
| Tamaño aproximado | `index.html` 237 líneas · `styles.css` 1171 · `app.js` 397 · `engine.js` 94 · `questions.js` 7802 · `storage.js` 20 |
| Dependencias / build | Ninguna dependencia. `package.json` solo declara ESM y `node --test`; sin build ni linter |
| Tests | 35 tests en `tests/cu-01` … `tests/cu-06`, runner nativo de Node |
| Specs | 6 propuestas en `specs/001-*` … `specs/006-*` (bugs detectados, pendientes de implementar) |
| Despliegue | Estático; basta con servir la carpeta por HTTP |
| Tema visual | «Expediente de examen»: azul y blanco, serif documental + sans de interfaz |
| Metodología | SDD (Spec-Driven Development), regida por `docs/constitution.md` v1.0.0 |

## Decisiones de arquitectura

- **SDD como metodología de trabajo**: `docs/constitution.md` es normativo y prevalece sobre convenciones no documentadas; toda especificación, plan, tarea y cambio debe ser conforme a él.
- **Vanilla JS con módulos ES**, sin framework ni bundler. La simplicidad y el funcionamiento offline son requisitos, no una limitación temporal.
- **Una sola página** (`index.html`) con cuatro secciones/pantallas (`home`, `quiz`, `results`, `history`) y un modal reutilizable. La navegación es visual (`switchScreen`), no basada en rutas ni en el historial del navegador.
- **Estado global mutable** en `app.js` en lugar de una librería de estado. El render es imperativo y manual.
- **Persistencia encapsulada** en `js/storage.js`; `app.js` nunca toca `localStorage` directamente.
- **Lógica pura separada (2026-11-03)**: `js/engine.js` concentra `shuffle`, `buildQuiz`, `toggleAnswer`, `buildActiveQuizSnapshot`, `scoreQuiz`, `createAttempt` y los formateadores. `app.js` conserva estado, timer, render y eventos. Así la lógica se prueba sin DOM ni dependencias.
- **Tests con el runner nativo de Node (2026-11-03)**: `node --test` + `node:assert/strict`. `package.json` existe únicamente para declarar `"type": "module"` y el script `npm test`; no tiene dependencias ni build.
- **Cronómetro por timestamps** (`Date.now()` + `accumulatedMs`), no por incremento de contadores, para resistir la suspensión de la pestaña.
- **Recuperación de examen**: cada respuesta persiste el test en `scs_active`; al cargar, se ofrece continuarlo o descartarlo.
- **Historial autocontenido**: cada intento guarda *snapshots* de preguntas y respuestas, de modo que cambios futuros en el banco no alteran intentos antiguos.
- **Aleatorización Fisher-Yates** aplicada ~~al banco y a las opciones de cada pregunta~~ *(obsoleto desde 2026-11-02)*. Desde entonces se barajan **solo las preguntas**; las opciones conservan el orden exacto definido en `questions.js`.
- **Corrección propia y modal propio**: no se usan `alert`, `confirm` ni `prompt`.
- **Rediseño «expediente de examen» (2026-11-03)**: la interfaz se inspira en una hoja de examen oficial. Azul noche/sello/trazo sobre papel blanco y azulado, titulares en serif de sistema (Palatino/Georgia) y controles en sans del sistema. Se retira el amarillo y los emojis decorativos. Las opciones del test usan burbujas tipo OMR y la tarjeta de pregunta incorpora un margen de folio numerado.
- **Sin fuentes ni recursos remotos**: el requisito offline impide usar Google Fonts u otros CDN; la identidad tipográfica se construye con pilas de fuentes locales.

## Convenciones acordadas

- Textos de interfaz, comentarios y documentación **en español**; código (nombres de variables/funciones) en inglés.
- Todo contenido dinámico insertado con `innerHTML` pasa por `escapeHTML()`.
- Los estilos nuevos usan las variables CSS de `:root`; no se añaden colores literales ni frameworks.
- Las claves de `localStorage` (`scs_alias`, `scs_history`, `scs_active`) se consideran contrato de datos: no cambiarlas sin migración.
- No añadir dependencias, CDN ni peticiones de red sin acordarlo.

## Aprendizajes y trampas

- **`file://` no funciona con módulos ES.** El `README.md` aún dice que se puede abrir `index.html` con doble clic; en la práctica hay que servir por HTTP (CORS bloquea `import`).
- **El tema visual ya no usa `--scs-blue` ni `--scs-yellow`.** Las variables vigentes son las de la familia `--azul-*` y `--tinta-*`; cualquier estilo nuevo debe partir de ellas.
- **Sin estilos inline en vistas**: `index.html` y el HTML generado por `app.js` usan clases del tema. Si se necesita un estado visual, añadir una clase en `styles.css`, no un `style="..."`.
- Las opciones del examen son `div` con `role="radio"` y foco propio; al re-renderizar hay que devolver el foco con el parámetro de `renderQuestion(focusOptionIndex)`.
- `questions.js` es enorme y solo contiene datos; editarlo a mano es propenso a errores de sintaxis. Validar que `correctOption` exista entre los `id` de `options`.
- Los IDs de pregunta son la clave de `userAnswers`; deben ser únicos y estables.
- `renderResults()` sirve tanto para el resultado recién calculado como para revisar un intento del historial; ambos deben tener la misma forma (`questionsSnapshot`, `userAnswersSnapshot`, etc.).
- El botón «Nuevo Test» en resultados solo vuelve a la pantalla de inicio; no reinicia el test directamente.
- `startQuiz(savedQuiz)` es la ruta de recuperación; cualquier cambio en el arranque debe contemplarla.
- Los exámenes en curso guardados antes del cambio de regla conservan en su snapshot el orden de opciones barajado; los intentos nuevos ya usan el orden fijo. El historial antiguo es inmutable.
- La constitución v1.1.0 no estaba en el árbol de trabajo (sí en el historial de Git); el 2026-11-03 se creó `docs/constitution.md` v1.0.0 como norma vigente. Las referencias antiguas a la raíz quedan como histórico.
- **`node --test` necesita ESM**: sin `"type": "module"` en `package.json`, Node interpreta los `.js` como CommonJS y falla con los `export`. No se puede importar `app.js` en tests porque registra `DOMContentLoaded` y usa `document`; por eso la lógica pura vive en `engine.js`.
- **La recuperación no se puede validar solo con tests unitarios**: el snapshot guarda bien `currentIndex`, pero «Anterior/Siguiente» no llama a `persistActiveQuiz()`; ese fallo exige prueba de integración en navegador.

## Deuda técnica e incidencias conocidas

- `README.md` referencia un archivo `LICENSE` que **no existe** en el repositorio.
- `Storage.getHistory()` y `getActiveQuiz()` hacen `JSON.parse` sin `try/catch`: un valor corrupto en `localStorage` rompería la app.
- No hay control de cuota de `localStorage`; los snapshots completos del historial pueden agotarla con muchos intentos.
- Los tests cubren solo la lógica pura: no hay tests de integración DOM ni verificación automática de integridad del banco (ids duplicados, `correctOption` válido).
- El modal no atrapa el foco dentro del diálogo (solo fija el foco inicial y permite cerrar con `Escape`).
- Incidencias verificadas y pendientes (2026-11-03), con spec asociada: «Anterior/Siguiente» no persiste la pregunta actual (001); `btn-restart-from-res` no refresca «Último resultado» (002); iniciar un test sobrescribe el examen en curso (003); `localStorage` corrupto rompe el arranque (004); el banner de recuperación dice «1 respondidas» (005); el modal deja el foco oculto y no atrapa el foco (006).

## Bitácora

- **2026-11-02** — Se crea `AGENTS.md` con la guía de trabajo para agentes (estructura, ejecución, convenciones, seguridad y checklist).
- **2026-11-02** — Se crea `MEMORY.md` como registro vivo de estado, decisiones y deuda técnica. Se enlaza desde `AGENTS.md` con la obligación de mantenerlo actualizado.
- **2026-11-02** — Se adopta SDD y se crea `constitution.md` v1.0.0 (principios, restricciones, flujo, puertas de calidad y gobernanza). Se referencia desde `AGENTS.md` como documento normativo.
- **2026-11-02** — Se fija el orden de las opciones: `startQuiz()` deja de barajar `q.options`; solo se aleatoriza el orden de las preguntas. Se actualizan `index.html`, `README.md`, `AGENTS.md` y `MEMORY.md`, y se enmienda `constitution.md` a v1.1.0 (§III).
- **2026-11-03** — Rediseño completo de la interfaz en la rama `feature_cambio_diseño`: tema «expediente de examen» en azul y blanco, portada con ficha del banco, hoja de pregunta con folio y opciones tipo OMR, resultados con nota destacada y corrección/historial sin emojis. Se eliminan todos los estilos inline de `index.html` y del HTML generado; se añaden foco visible, opciones manejables por teclado, `aria-live` en el contador, `aria-valuenow` en el progreso y gestión de foco/`Escape`/`aria-hidden` en el modal. Verificado el flujo completo con Chrome headless (inicio, respuesta, teclado, finalización, resultados, historial y recuperación tras recarga) sin errores de consola ni desbordamiento horizontal en 375 px y 1280 px.
- **2026-11-03** — Se crea `docs/constitution.md` v1.0.0 (texto nuevo aprobado) con seis principios (stack mínimo, spec-código, separación lógica/interfaz, verificación sin dependencias, datos protegidos e idioma) y se actualizan las referencias de `AGENTS.md` y `MEMORY.md`. La v1.1.0 anterior, ausente del árbol de trabajo, permanece en el historial (commit `ab5c9a6`).
- **2026-11-03** — Rama `hotfix_001`: se extrae la lógica pura a `js/engine.js` (sin cambio de comportamiento), se añade `package.json` sin dependencias (`"type": "module"` + `npm test`) y se crean 35 tests en `tests/cu-01` … `tests/cu-06` para los casos de uso esenciales. Verificado con `npm test` (35/35) y con Chrome DevTools: flujo completo, historial, alias, consola limpia y sin desbordamiento a 375 px y 500 px.
