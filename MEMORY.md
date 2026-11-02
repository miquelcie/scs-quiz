# MEMORY.md

Documento vivo con el contexto acumulado del proyecto: estado, decisiones, aprendizajes y deuda técnica. Complementa a `AGENTS.md` (que describe *cómo* trabajar); aquí se registra *qué* se ha decidido y *qué* se ha aprendido.

> **Protocolo:** este archivo debe actualizarse al terminar cada tarea relevante. Añadir entradas fechadas al final, no borrar decisiones anteriores (marcarlas como obsoletas si dejan de aplicar). Mantenerlo breve: hechos y decisiones, no volcados de código.

---

## Estado actual

| Dato | Valor |
| --- | --- |
| Rama | `main` |
| Último commit | `7d71ebc` — *Se elimina carpeta public* (2026-10-30) |
| Preguntas en el banco | 300 (`SCS-RAD-001` … `SCS-RAD-300`) |
| Tamaño aproximado | `index.html` 212 líneas · `styles.css` 482 · `app.js` 367 · `questions.js` 7802 · `storage.js` 20 |
| Dependencias / build | Ninguna. Sin `package.json`, tests ni linter |
| Despliegue | Estático; basta con servir la carpeta por HTTP |
| Metodología | SDD (Spec-Driven Development), regida por `constitution.md` v1.1.0 |

## Decisiones de arquitectura

- **SDD como metodología de trabajo**: `constitution.md` es normativo y prevalece sobre convenciones no documentadas; toda especificación, plan, tarea y cambio debe ser conforme a él.
- **Vanilla JS con módulos ES**, sin framework ni bundler. La simplicidad y el funcionamiento offline son requisitos, no una limitación temporal.
- **Una sola página** (`index.html`) con cuatro secciones/pantallas (`home`, `quiz`, `results`, `history`) y un modal reutilizable. La navegación es visual (`switchScreen`), no basada en rutas ni en el historial del navegador.
- **Estado global mutable** en `app.js` en lugar de una librería de estado. El render es imperativo y manual.
- **Persistencia encapsulada** en `js/storage.js`; `app.js` nunca toca `localStorage` directamente.
- **Cronómetro por timestamps** (`Date.now()` + `accumulatedMs`), no por incremento de contadores, para resistir la suspensión de la pestaña.
- **Recuperación de examen**: cada respuesta persiste el test en `scs_active`; al cargar, se ofrece continuarlo o descartarlo.
- **Historial autocontenido**: cada intento guarda *snapshots* de preguntas y respuestas, de modo que cambios futuros en el banco no alteran intentos antiguos.
- **Aleatorización Fisher-Yates** aplicada ~~al banco y a las opciones de cada pregunta~~ *(obsoleto desde 2026-11-02)*. Desde entonces se barajan **solo las preguntas**; las opciones conservan el orden exacto definido en `questions.js`.
- **Corrección propia y modal propio**: no se usan `alert`, `confirm` ni `prompt`.

## Convenciones acordadas

- Textos de interfaz, comentarios y documentación **en español**; código (nombres de variables/funciones) en inglés.
- Todo contenido dinámico insertado con `innerHTML` pasa por `escapeHTML()`.
- Los estilos nuevos usan las variables CSS de `:root`; no se añaden colores literales ni frameworks.
- Las claves de `localStorage` (`scs_alias`, `scs_history`, `scs_active`) se consideran contrato de datos: no cambiarlas sin migración.
- No añadir dependencias, CDN ni peticiones de red sin acordarlo.

## Aprendizajes y trampas

- **`file://` no funciona con módulos ES.** El `README.md` aún dice que se puede abrir `index.html` con doble clic; en la práctica hay que servir por HTTP (CORS bloquea `import`).
- `questions.js` es enorme y solo contiene datos; editarlo a mano es propenso a errores de sintaxis. Validar que `correctOption` exista entre los `id` de `options`.
- Los IDs de pregunta son la clave de `userAnswers`; deben ser únicos y estables.
- `renderResults()` sirve tanto para el resultado recién calculado como para revisar un intento del historial; ambos deben tener la misma forma (`questionsSnapshot`, `userAnswersSnapshot`, etc.).
- El botón «Nuevo Test» en resultados solo vuelve a la pantalla de inicio; no reinicia el test directamente.
- `startQuiz(savedQuiz)` es la ruta de recuperación; cualquier cambio en el arranque debe contemplarla.
- Los exámenes en curso guardados antes del cambio de regla conservan en su snapshot el orden de opciones barajado; los intentos nuevos ya usan el orden fijo. El historial antiguo es inmutable.

## Deuda técnica e incidencias conocidas

- `README.md` referencia un archivo `LICENSE` que **no existe** en el repositorio.
- No hay `.gitignore`.
- Abundantes estilos inline en `index.html` (deuda heredada).
- `Storage.getHistory()` y `getActiveQuiz()` hacen `JSON.parse` sin `try/catch`: un valor corrupto en `localStorage` rompería la app.
- No hay control de cuota de `localStorage`; los snapshots completos del historial pueden agotarla con muchos intentos.
- Sin tests automatizados ni verificación de integridad del banco de preguntas.

## Bitácora

- **2026-11-02** — Se crea `AGENTS.md` con la guía de trabajo para agentes (estructura, ejecución, convenciones, seguridad y checklist).
- **2026-11-02** — Se crea `MEMORY.md` como registro vivo de estado, decisiones y deuda técnica. Se enlaza desde `AGENTS.md` con la obligación de mantenerlo actualizado.
- **2026-11-02** — Se adopta SDD y se crea `constitution.md` v1.0.0 (principios, restricciones, flujo, puertas de calidad y gobernanza). Se referencia desde `AGENTS.md` como documento normativo.
- **2026-11-02** — Se fija el orden de las opciones: `startQuiz()` deja de barajar `q.options`; solo se aleatoriza el orden de las preguntas. Se actualizan `index.html`, `README.md`, `AGENTS.md` y `MEMORY.md`, y se enmienda `constitution.md` a v1.1.0 (§III).
