# MEMORY.md

Documento vivo con el contexto acumulado del proyecto: estado, decisiones, aprendizajes y deuda técnica. Complementa a `AGENTS.md` (que describe *cómo* trabajar); aquí se registra *qué* se ha decidido y *qué* se ha aprendido.

> **Protocolo:** este archivo debe actualizarse al terminar cada tarea relevante. Añadir entradas fechadas al final, no borrar decisiones anteriores (marcarlas como obsoletas si dejan de aplicar). Mantenerlo breve: hechos y decisiones, no volcados de código.

---

## Estado actual

| Dato | Valor |
| --- | --- |
| Rama | `hotfix_001` |
| Último commit | `af5a10b` — *feat: confirmar antes de descartar el examen en curso* (2026-11-05) |
| Preguntas en el banco | 300 (`SCS-RAD-001` … `SCS-RAD-300`) |
| Tamaño aproximado | `index.html` 237 líneas · `styles.css` 1174 · `app.js` 483 · `engine.js` 270 · `questions.js` 7802 · `storage.js` 108 |
| Dependencias / build | Ninguna dependencia. `package.json` solo declara ESM y `node --test`; sin build ni linter |
| Tests | 86 tests en `tests/cu-01` … `tests/cu-06`, runner nativo de Node |
| Specs | 6 propuestas en `specs/001-*` … `specs/006-*`; 001–005 implementadas (2026-11-05), 006 pendiente |
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
- **Salida única a la portada (2026-11-05)**: `returnHome()` pinta `renderLastAttempt()` antes de `switchScreen('home')`; las tres salidas de resultados/historial comparten la misma ruta para no divergir y para que el foco de 006 caiga sobre contenido actualizado.
- **Confirmación antes de descartar un examen (2026-11-05)**: `handleStartQuiz()` relee `scs_active` en el clic; si hay un snapshot válido abre el modal «Examen en curso» y solo el callback de confirmación borra (`clearActiveQuiz()`) y arranca. «Continuar examen» reanuda sin modal. La decisión no usa el estado cacheado de la carga para cubrir cambios externos entre carga y clic.
- ~~**Lectura defensiva mínima de `scs_active` (2026-11-05)**: `readActiveQuiz()` en `storage.js` devuelve `null` ante JSON corrupto, forma inválida, `questions` vacío, `userAnswers` no objeto o `currentIndex` no entero.~~ *(obsoleta desde 2026-11-05 con 004: sustituida por `normalizeActiveQuiz()` y por la lectura/escritura defensiva de `storage.js`).*
- **Robustez de los datos persistidos (2026-11-05)**: `storage.js` centraliza lectura y escritura defensivas (`readJSON`, `writeJSON`, `removeKey`) con aviso único por clave y sesión; las escrituras devuelven booleano y la UI avisa con el modal si falla un guardado o un borrado. `engine.js` valida y normaliza datos puros: estructura/tipos inválidos → `null`, índice fuera de rango → recorte, tiempo negativo o no finito → `0`, respuestas ajenas o con opción inexistente → descartadas. El historial recalcula sus métricas desde los snapshots y `saveAttempt`/`deleteAttempt` parten del array crudo para no borrar entradas inválidas. Las lecturas nunca escriben.
- **Textos del banner de recuperación (2026-11-05)**: `countAnswered()` cuenta solo respuestas no vacías que pertenecen a una opción de una pregunta válida; `formatRecoveryInfo()` devuelve el texto completo con `pluralize()` y `""` si no hay preguntas, sin lanzar con argumentos de cualquier tipo. `app.js` pinta el resultado con `textContent`. Aunque el plan describía `pluralize` como interna, se exporta para poder probarla directamente como pide T01; sigue siendo un helper puro sin estado.
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
- **La recuperación no se puede validar solo con tests unitarios**: el snapshot guarda bien `currentIndex` y el round-trip se cubre con tests, pero el enganche de «Anterior/Siguiente» y de los eventos del ciclo de vida exige prueba de integración en navegador. *(Resuelto el 2026-11-04 con 001: `navigate()`, `pagehide` y `visibilitychange` persisten el examen; verificado en Chrome DevTools.)*
- **`pagehide` reescribe `scs_active` al recargar (2026-11-05)**: para sembrar un `scs_active` corrupto en pruebas manuales hay que hacerlo con el `initScript` de la navegación o después de que la página cargue. Si se escribe justo antes de recargar, el `pagehide` de la página saliente guarda el estado actual y pisa el valor sembrado.
- **Simular fallos de `localStorage` (2026-11-05)**: en Chrome se puede sustituir `Storage.prototype.setItem`/`removeItem` por una función que lance para probar los avisos de la UI sin tocar el código. Los avisos de `storage.js` se deduplican por clave, así que un segundo fallo de la misma clave no repite el `console.warn`, pero el modal sí vuelve a aparecer.
- **Node v24 y `node --test` con directorios (2026-11-05)**: `node --test tests/cu-03` falla con `MODULE_NOT_FOUND`; hay que pasar el archivo completo (`node --test tests/cu-03/recuperar.test.js`) o ejecutar `node --test` desde la raíz.

## Deuda técnica e incidencias conocidas

- `README.md` referencia un archivo `LICENSE` que **no existe** en el repositorio.
- ~~`Storage.getHistory()` hace `JSON.parse` sin `try/catch`: un valor corrupto en `scs_history` rompería la app. `getActiveQuiz()` ya tiene lectura defensiva mínima desde 2026-11-05; falta la normalización completa del plan 004.~~ *(resuelta el 2026-11-05 con 004: `readJSON`/`writeJSON`/`removeKey` y normalización en `engine.js`).*
- No hay control de cuota de `localStorage`; los snapshots completos del historial pueden agotarla con muchos intentos.
- Los tests cubren solo la lógica pura: no hay tests de integración DOM ni verificación automática de integridad del banco (ids duplicados, `correctOption` válido).
- El modal no atrapa el foco dentro del diálogo (solo fija el foco inicial y permite cerrar con `Escape`).
- Incidencias verificadas y pendientes (2026-11-03), con spec asociada: ~~«Anterior/Siguiente» no persiste la pregunta actual (001)~~ *(resuelta el 2026-11-04)*; ~~`btn-restart-from-res` no refresca «Último resultado» (002)~~ *(resuelta el 2026-11-05)*; ~~iniciar un test sobrescribe el examen en curso (003)~~ *(resuelta el 2026-11-05)*; ~~`localStorage` corrupto rompe el arranque (004)~~ *(resuelta el 2026-11-05)*; ~~el banner de recuperación dice «1 respondidas» (005)~~ *(resuelta el 2026-11-05)*; el modal deja el foco oculto y no atrapa el foco (006).

## Bitácora

- **2026-11-02** — Se crea `AGENTS.md` con la guía de trabajo para agentes (estructura, ejecución, convenciones, seguridad y checklist).
- **2026-11-02** — Se crea `MEMORY.md` como registro vivo de estado, decisiones y deuda técnica. Se enlaza desde `AGENTS.md` con la obligación de mantenerlo actualizado.
- **2026-11-02** — Se adopta SDD y se crea `constitution.md` v1.0.0 (principios, restricciones, flujo, puertas de calidad y gobernanza). Se referencia desde `AGENTS.md` como documento normativo.
- **2026-11-02** — Se fija el orden de las opciones: `startQuiz()` deja de barajar `q.options`; solo se aleatoriza el orden de las preguntas. Se actualizan `index.html`, `README.md`, `AGENTS.md` y `MEMORY.md`, y se enmienda `constitution.md` a v1.1.0 (§III).
- **2026-11-03** — Rediseño completo de la interfaz en la rama `feature_cambio_diseño`: tema «expediente de examen» en azul y blanco, portada con ficha del banco, hoja de pregunta con folio y opciones tipo OMR, resultados con nota destacada y corrección/historial sin emojis. Se eliminan todos los estilos inline de `index.html` y del HTML generado; se añaden foco visible, opciones manejables por teclado, `aria-live` en el contador, `aria-valuenow` en el progreso y gestión de foco/`Escape`/`aria-hidden` en el modal. Verificado el flujo completo con Chrome headless (inicio, respuesta, teclado, finalización, resultados, historial y recuperación tras recarga) sin errores de consola ni desbordamiento horizontal en 375 px y 1280 px.
- **2026-11-03** — Se crea `docs/constitution.md` v1.0.0 (texto nuevo aprobado) con seis principios (stack mínimo, spec-código, separación lógica/interfaz, verificación sin dependencias, datos protegidos e idioma) y se actualizan las referencias de `AGENTS.md` y `MEMORY.md`. La v1.1.0 anterior, ausente del árbol de trabajo, permanece en el historial (commit `ab5c9a6`).
- **2026-11-03** — Rama `hotfix_001`: se extrae la lógica pura a `js/engine.js` (sin cambio de comportamiento), se añade `package.json` sin dependencias (`"type": "module"` + `npm test`) y se crean 35 tests en `tests/cu-01` … `tests/cu-06` para los casos de uso esenciales. Verificado con `npm test` (35/35) y con Chrome DevTools: flujo completo, historial, alias, consola limpia y sin desbordamiento a 375 px y 500 px.
- **2026-11-03** — Se revisan los seis specs como QA y se crean sus `plan.md` (uno por spec) con trazabilidad RF, archivos, funciones puras, pseudocódigo, pintado, decisiones y estrategia de tests. Se aplican a los `spec.md` las enmiendas detectadas: definición de «examen activo» (001), «último intento» = `history[0]` y unificación de las tres salidas (002), criterio del banner, comparación de `scs_active` y relectura en el clic (003), validación frente a normalización, aviso de fallo de escritura y preservación del crudo (004), pluralización de `N` (005) y destinos de foco, `hidden` con regla CSS e `inert` sin `aria-hidden` (006). Cobertura verificada: 42/42 RF referenciados en los planes. Sin cambios de código; `npm test` sigue en 35/35.
- **2026-11-03** — Se crean los seis `specs/**/tasks.md` con 49 tareas de 15–30 min, ordenadas por dependencia, con RF cubiertos y un «Hecho cuando» verificable por tarea. La cobertura se comprobó con un script: 42/42 RF aparecen en al menos una tarea de su spec. Sin cambios de código; los `tasks.md` quedan sin commitear.
- **2026-11-04** — Implementado 001 (persistir la navegación): tests primero en CU-02/CU-03 (fallaron por exportaciones ausentes), luego `moveIndex()` e `isQuizInProgress()` en `engine.js`, `saveActiveQuizNow()`/`persistActiveQuiz()` con guarda de pantalla, `navigate()` conectado a «Anterior/Siguiente», listeners `visibilitychange`/`pagehide` y recorte del índice al recuperar. `node --test` → 43/43. Verificado en Chrome DevTools: recarga en la pregunta 3 (`currentIndex: 2`, tiempo conservado), retroceso a la 2 tras recargar, `pagehide`/`visibilitychange` suman tiempo, resultados e historial correctos, `scs_active` no se escribe fuera del examen, consola limpia y 375 px reales vía CDP sin desbordamiento. Las 7 tareas de `tasks.md` quedan marcadas y con evidencia de cierre.
- **2026-11-05** — Implementado 002 (refrescar «Último resultado»): test de solo lectura del historial en CU-05 y después `returnHome()` en `app.js`, que ejecuta `renderLastAttempt()` antes de `switchScreen('home')`; las tres salidas de resultados/historial comparten esa ruta. `node --test` → 44/44. Verificado en Chrome DevTools con dos intentos (0 % y 100 %): las tres salidas muestran `history[0]`, revisar el antiguo y volver muestra el último, el historial no cambia, el estado vacío aparece en las tres rutas, consola limpia y 375 px reales vía CDP sin desbordamiento. Las 5 tareas de `tasks.md` quedan marcadas.
- **2026-11-05** — Implementado 003 (proteger el examen en curso): tests primero en CU-03 (sustitución tras descarte y lectura inválida), luego `handleStartQuiz()`/`confirmDiscardActiveQuiz()` en `app.js` y una lectura defensiva mínima `readActiveQuiz()` en `storage.js` para que JSON corrupto o forma inválida se lean como `null`. El modal reutiliza `#custom-modal`, el título «Examen en curso» y el copy normativo. `node --test` → 47/47. Verificado en Chrome DevTools: el modal aparece sin tocar `scs_active`; cancelar y `Escape` lo dejan idéntico y mantienen el banner; confirmar inicia en la pregunta 1 con cuestionario nuevo; «Continuar examen» reanuda sin modal y restaura pregunta/respuestas; `scs_active = "{"` inicia un test sin modal; añadir o quitar el examen entre carga y clic cambia el resultado sin romper; consola limpia y modal a 375 px reales sin desbordamiento. Las 7 tareas de `tasks.md` quedan marcadas.
- **2026-11-05** — Implementado 004 (robustez de los datos persistidos): tests primero en CU-03, CU-04, CU-05 y CU-06 (validadores, normalización, formateadores, historial crudo y fallos inyectables), luego `engine.js` (validadores/normalizadores y guardias de formato), `storage.js` (lectura/escritura defensiva, aviso único por clave y booleano en las escrituras) y `app.js` (escapado/conversión del historial y modales de fallo). `node --test` → 76/76. Verificado en Chrome DevTools: `scs_active = "{"` arranca sin banner y permite un test; `scs_history = "null"` muestra el estado vacío y guarda al terminar; `currentIndex: 999` abre la última pregunta válida; una respuesta a un id inexistente no se cuenta; un alias/id con `<img onerror>` se pinta como texto; los fallos forzados de guardado/borrado muestran el modal y conservan los datos; consola con un solo aviso controlado y las cuatro pantallas a 375 px reales vía CDP sin desbordamiento. Las 14 tareas de `tasks.md` quedan marcadas y con evidencia de cierre.
- **2026-11-05** — Implementado 005 (textos y recuento del banner de recuperación): tests primero en CU-03 (10 casos de `pluralize`, `countAnswered` y `formatRecoveryInfo`), luego las tres funciones puras en `engine.js` y la sustitución del texto construido a mano en `app.js` por `formatRecoveryInfo(activeQuiz.questions, activeQuiz.userAnswers)` con `textContent`. `node --test` → 86/86. Verificado en Chrome DevTools: 0 respuestas → «Hay un examen de 25 preguntas en curso.»; 1 → «(1 respondida)»; 2 → «(2 respondidas)»; un test de una pregunta → «Hay un examen de 1 pregunta en curso (1 respondida).»; consola limpia y banner a 375 px reales vía CDP sin desbordamiento. Las 5 tareas de `tasks.md` quedan marcadas y con evidencia de cierre.
