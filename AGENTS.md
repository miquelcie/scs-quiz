# AGENTS.md

Guía para agentes de IA que trabajen en este repositorio.

## Descripción del proyecto

SPA de simulación de exámenes tipo test para las oposiciones del **Servicio Canario de Salud (SCS)** (categoría Técnico/a Especialista en Radiodiagnóstico y Legislación Autonómica).

- **100 % client-side**: sin backend, sin base de datos, sin llamadas de red.
- **Sin build step ni dependencias**: HTML5 + CSS3 + JavaScript (ES6+) *vanilla*.
- Los datos del usuario (alias, historial, examen en curso) viven en `localStorage`.

## Documentos del proyecto

- `docs/constitution.md` — **normativo**: principios no negociables (SDD). Toda especificación, plan, tarea o cambio debe ser conforme a él.
- `AGENTS.md` — convenciones operativas para agentes.
- `MEMORY.md` — estado y conocimiento acumulado.

Antes de implementar un cambio no trivial: verificar conformidad con la constitución, y si se propone una excepción, justificarla y registrarla.

## Memoria del proyecto (`MEMORY.md`)

`MEMORY.md` es el registro vivo del proyecto: estado actual, decisiones de arquitectura, aprendizajes, deuda técnica y bitácora. **Debe actualizarse al terminar cada tarea relevante.**

Al finalizar un cambio:

1. Si se tomó una decisión de diseño, se descubrió una trampa o se modificó el estado del proyecto, añadir una entrada **fechada** (`YYYY-MM-DD`) en la sección correspondiente de `MEMORY.md`.
2. Añadir también una línea en la **Bitácora** resumiendo el cambio.
3. No borrar entradas anteriores: si una decisión deja de aplicar, marcarla como obsoleta y explicar por qué.
4. No duplicar en `MEMORY.md` lo que ya describe `AGENTS.md`; este último define *cómo* trabajar y `MEMORY.md` registra *qué* ha pasado.
5. Mantener ambos archivos sincronizados: si cambia una convención o un comando, actualizar `AGENTS.md`; si cambia el estado o el conocimiento acumulado, actualizar `MEMORY.md`.

## Estructura

```
index.html          # Única página; contiene las 4 "pantallas" y el modal global
css/styles.css      # Todo el estilo (variables CSS, sin frameworks)
js/app.js           # Punto de entrada (type="module"): DOMContentLoaded, alias, banner y listeners
js/state.js         # Único objeto `state` mutable (exportado)
js/dom.js           # Constantes SCREENS/IDS/OPTION_PREFIXES y helpers byId/optionPrefix
js/ui/modal.js      # Modal propio, foco, `inert` y switchScreen
js/ui/render.js     # Render de pregunta, resultados, último intento e historial paginado
js/flow/quiz.js     # Timer, persistencia, navegación, arranque y finalización
js/engine.js        # Lógica pura del examen (testeable con node --test)
js/questions.js     # Banco de preguntas (export const QUESTION_BANK)
js/storage.js       # Wrapper de localStorage (export const Storage)
specs/NNN-*/        # Especificaciones SDD (una carpeta por cambio)
tests/cu-XX/        # Tests de los casos de uso esenciales
tests/cu-07/        # Ciclo de foco del modal (nextFocusIndex)
tests/cu-08/        # Paginación pura del historial (paginate)
tests/helpers/      # Fixtures y localStorage en memoria
package.json        # Solo ESM + script de test; sin dependencias
images/favicon.ico
README.md           # Documentación de usuario
AGENTS.md           # Esta guía (cómo trabajar en el repo)
MEMORY.md           # Memoria viva del proyecto (estado, decisiones, deuda técnica)
docs/constitution.md # Constitución SDD: principios normativos del proyecto
```

## Ejecución

No hay build, linter ni dependencias externas. `package.json` existe solo para declarar `"type": "module"` y el script de test; no tiene `dependencies` ni `devDependencies`. Para ejecutar:

```bash
# Opción recomendada (los módulos ES fallan con file:// por CORS)
python -m http.server 8000
# o
npx serve .
```

Luego abrir `http://localhost:8000`.

`index.html` usa `<script type="module">`; abrirlo con doble clic (`file://`) provoca errores de CORS en la mayoría de navegadores.

## Tests

```bash
npm test        # equivale a node --test
node --test     # sin pasar por npm
```

- Se usa el runner nativo de Node (`node:test` + `node:assert/strict`); no se instala ninguna dependencia.
- `tests/cu-XX/` agrupa un caso de uso esencial; `tests/helpers/` contiene fixtures y un `localStorage` en memoria.
- La lógica testeable vive en `js/engine.js` (pura, sin DOM). No importar `js/app.js` en tests: registra `DOMContentLoaded` y usa `document`.
- `js/storage.js` se testea inyectando `globalThis.localStorage` antes de cada test.
- Casos cubiertos: CU-01 iniciar simulacro, CU-02 responder, CU-03 recuperar, CU-04 finalizar, CU-05 historial (incluido `HISTORY_LIMIT` y la rotación), CU-06 alias (`Storage` y funciones puras `sanitizeAlias`/`isValidAlias`), CU-07 ciclo de foco del modal (`nextFocusIndex`) y CU-08 paginación (`paginate`).
- Los tests no sustituyen la verificación manual con Chrome DevTools.

## Arquitectura y convenciones

### `js/app.js`

- Punto de entrada: solo `DOMContentLoaded`, carga y saneado del alias, banner de recuperación, datos del banco y registro de listeners fijos. Debe quedar por debajo de 200 líneas.
- Los listeners se registran una sola vez para elementos fijos del HTML. Para contenido dinámico se usa delegación de eventos sobre un contenedor estable.

### `js/state.js`

- Único objeto `state` mutable: `alias`, `questions`, `userAnswers`, `currentIndex`, `accumulatedMs`, `startTimestamp`, `timerInterval`. Ningún otro módulo declara estado global propio.

### `js/dom.js`

- Constantes compartidas sin dependencias: `SCREENS`, `IDS`, `BACKGROUND_REGIONS`, `OPTION_PREFIXES`, `optionPrefix(index)`, `byId(id)` y `screenId(screen)`.
- Usar `SCREENS.*` e `IDS.*` en lugar de literales de pantalla o identificadores repetidos.

### `js/ui/modal.js`

- `showModal(title, msg, onConfirm, onCancel = null)`, `closeModal`, `showStorageError` y `switchScreen`.
- Navegación por **pantallas**, no por rutas: `switchScreen(screen)` activa `#screen-<screen>` quitando/añadiendo la clase `.active`. Pantallas: `home`, `quiz`, `results`, `history`.
- El modal es propio; no usar `alert`/`confirm`/`prompt`. Se oculta con `hidden`, usa `aria-labelledby`/`aria-describedby`, aplica `inert` al fondo (`header`, `main`, `footer`), bloquea el scroll con `body.modal-open`, enfoca «Aceptar», atrapa `Tab`/`Shift+Tab` con `nextFocusIndex()` y escucha `Escape` en `document` mientras está abierto. No se usa `aria-hidden` dinámico.
- `onCancel` es opcional: se ejecuta al pulsar «Cancelar» o `Escape`. El aviso de historial completo lo usa para mostrar el resultado sin guardar.

### `js/ui/render.js`

- Renderizado imperativo con `document.createElement`, `DocumentFragment` e `innerHTML`. No hay framework reactivo: tras cambiar el estado hay que volver a renderizar explícitamente.
- Las opciones del examen son accesibles por teclado: `role="radio"`, `tabindex="0"` y selección con `Enter`/`Espacio`. `renderQuestion(focusOptionIndex)` conserva el foco tras volver a renderizar.
- En la última pregunta `renderQuestion()` oculta `#btn-finish-quiz` y, si tenía el foco, lo traslada a `#btn-next-q` antes de ocultarlo; al retroceder vuelve a mostrarse.
- `renderResults(attempt)` se reutiliza al finalizar y al revisar un intento del historial; `renderLastAttempt()` pinta la tarjeta de portada y `returnHome()` renderiza antes de cambiar de pantalla.
- El historial se pagina de 10 en 10 (`HISTORY_PAGE_SIZE`): «Cargar más (N restantes)» añade páginas sin repintar las anteriores y el pie usa `aria-live="polite"`. «Ver»/«Eliminar» usan delegación de eventos sobre `#history-list-container`.
- No importa `flow/quiz.js`: el flujo registra `setAnswerChangeHandler(persistActiveQuiz)` para evitar ciclos.

### `js/flow/quiz.js`

- Ciclo de vida del examen: cronómetro, persistencia, navegación, arranque y finalización.
- El cronómetro se basa en `Date.now()` (no en contar *ticks*) para sobrevivir a la suspensión de la pestaña. `accumulatedMs` guarda el tiempo de tramos anteriores.
- Cada respuesta y cada navegación llaman a `persistActiveQuiz()` para permitir la recuperación tras una recarga.
- `startQuiz(savedQuiz, bank)` es la ruta de recuperación; `handleStartQuiz(bank)` relee `scs_active` en el clic. El banco se pasa como parámetro para no importar `questions.js` desde `flow/`.
- `startQuiz()` baraja **solo el orden de las preguntas**. Las opciones de cada pregunta conservan el orden exacto de `questions.js`: no aplicar `shuffle` a `q.options`.
- Al finalizar, si el historial está lleno (`HISTORY_LIMIT = 50`), se pide confirmación y solo entonces se rota; cancelar muestra el resultado sin escribir en el historial y avisa con `NOT_SAVED_MESSAGE`.

### `js/engine.js`

- Lógica pura sin DOM ni almacenamiento: `shuffle`, `buildQuiz`, `toggleAnswer`, `buildActiveQuizSnapshot`, `scoreQuiz`, `createAttempt`, `paginate`, validadores/normalizadores, alias (`ALIAS_MAX_LENGTH`, `ALIAS_PATTERN`, `sanitizeAlias`, `isValidAlias`) y formateadores (`formatTime`, `formatPct`, `formatDate`, `escapeHTML`).
- `HISTORY_PAGE_SIZE = 10` y `paginate(list, page, pageSize)` no mutan la lista; `page` se recorta al rango válido y un `pageSize` inválido usa el valor por defecto.
- `shuffle()` y `buildQuiz()` aceptan un RNG opcional para tests deterministas; en producción usan `Math.random`.
- No mover aquí estado global, render ni eventos: eso pertenece a `state.js`, `ui/` y `flow/`.

### `js/storage.js`

Claves de `localStorage` (no cambiarlas sin migrar datos):

| Clave         | Contenido                                  |
| ------------- | ------------------------------------------ |
| `scs_alias`   | Alias del aspirante                        |
| `scs_history` | Array de intentos (el más reciente primero) |
| `scs_active`  | Examen en curso (recuperación)             |

Mantener todo acceso a `localStorage` dentro de este módulo; no usarlo directamente en `app.js`, `ui/` ni `flow/`.

- `HISTORY_LIMIT = 50` es el máximo de intentos que se conservan al rotar. `getHistoryLength()` cuenta el crudo (incluidas entradas inválidas) y `saveAttempt(attempt, { rotate: true })` elimina la entrada representable más antigua solo cuando se supera el límite. Sin `rotate`, no se descarta nada.
- La rotación y el borrado parten del array crudo para no reescribir ni perder entradas inválidas.
- El historial se muestra paginado de 10 en 10, pero el límite de almacenamiento sigue siendo 50.

### Alias de usuario (CU-06)

- Conjunto permitido: letras Unicode (tildes y `ñ` incluidas), dígitos, `_` y `-`; `ALIAS_PATTERN = /^[\p{L}\p{N}_-]+$/u`.
- Sin espacios ni otros símbolos. Máximo 30 caracteres (`ALIAS_MAX_LENGTH`).
- El alias vacío es válido porque es opcional; la interfaz muestra «Aspirante».
- `sanitizeAlias()` filtra en vivo el valor del input, conserva el cursor y alimenta `state.alias`, `#display-alias` y `scs_alias`; nunca se persiste un valor bruto inválido.
- Al cargar, el alias guardado se normaliza y se vuelve a persistir si cambió. Los intentos del historial no se reescriben.
- El campo usa `aria-describedby="alias-help"`, `maxlength="30"`, `autocomplete="username"`, `autocapitalize="none"` y `spellcheck="false"`.

### Esquema del banco de preguntas

Cada entrada de `QUESTION_BANK`:

```js
{
  id: "SCS-RAD-001",          // único y estable; se usa como clave de respuesta
  statement: "Enunciado...",
  options: [                   // 4–5 opciones
    { id: "A", text: "..." },
    { id: "B", text: "..." }
  ],
  correctOption: "B",          // debe coincidir con un options[].id
  explanation: "",             // opcional; se muestra en la corrección si no está vacío
  document: "Certificación Repertorio Definitivo TE Radiodiagnóstico",
  page: 1
}
```

Reglas al añadir o editar preguntas:

- `id` en formato `SCS-RAD-NNN`, sin huecos ni duplicados.
- `correctOption` debe existir entre los `id` de `options`.
- Codificación **UTF-8** (hay tildes, `ñ` y `¿`).
- `questions.js` es principalmente datos; no añadir lógica de negocio en él.
- El orden de `options` es el orden de presentación: no se reordena en tiempo de ejecución. Mantener los `id` en secuencia `A`, `B`, `C`, `D`…
- El banco actual tiene 300 preguntas y se muestra su tamaño en la pantalla de inicio.

### `css/styles.css`

- Tema «expediente de examen»: variables en `:root` para azules (`--azul-noche`, `--azul-sello`, `--azul-trazo`, `--azul-cielo`), papel/tinta (`--papel`, `--azul-papel`, `--tinta`, `--tinta-suave`, `--filete`) y corrección (`--acierto`, `--error`, `--pendiente`). Tipografías: `--fuente-titulo` (serif documental) y `--fuente-texto` (interfaz).
- Usar las variables existentes en lugar de colores literales nuevos.
- Clases de botón: `.btn` + `.btn-primary` / `.btn-accent` / `.btn-secondary` / `.btn-danger`, y `.btn-sm`, `.btn-lg`, `.w-full`.
- Responsive con `@media (min-width: 768px)` y `@media (max-width: 599px)`, CSS Grid/Flexbox. Sin dependencias externas ni fuentes remotas.
- `@media print` imprime solo la pantalla activa (`.screen { display:none }` + `.screen.active { display:block }`), oculta cabecero, pie, barras, botones, banner y modal, y evita cortar `.review-item` (`break-inside: avoid`). Los badges de estado se refuerzan con borde para leerse en blanco y negro.
- No reintroducir estilos inline ni emojis decorativos en la interfaz; la jerarquía se resuelve con clases del tema.

## Seguridad

- Todo texto de origen dinámico que se inserte con `innerHTML` debe pasar por `escapeHTML()`. Se aplica a enunciados, opciones, explicaciones y alias.
- No introducir `eval`, `new Function`, scripts remotos ni peticiones de red: el proyecto debe seguir funcionando offline.
- No añadir dependencias, CDNs ni frameworks sin acuerdo explícito.

## Checklist antes de dar un cambio por terminado

1. La app carga sin errores en consola sirviéndola por HTTP.
2. Flujo completo probado: iniciar test → responder → navegar → finalizar → resultados → historial → recuperación tras recarga.
3. Las respuestas se guardan/recuperan correctamente desde `localStorage`.
4. Cualquier HTML generado escapa el contenido del usuario.
5. Interfaz y comentarios coherentes en español; sin cambios de formato ajenos al objetivo.
6. `MEMORY.md` actualizado: estado, decisiones o trampas nuevas y entrada en la bitácora.
7. `npm test` en verde y verificación manual con el MCP de Chrome DevTools: abre `index.html`, prueba la funcionalidad, revisa la consola y comprueba la vista móvil (375 px).

## Comandos
- Tests: `npm test` (o `node --test`)
- Servidor local: `python -m http.server 8000`

## Reglas
- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código. 

## Notas / trampas conocidas

- `startQuiz()` acepta un `savedQuiz` opcional: es la ruta de recuperación. Si se toca el flujo de inicio, revisar también `btn-resume-quiz`.
- `renderResults()` se reutiliza tanto al finalizar como al revisar un intento del historial; recibe un objeto `attempt` con `questionsSnapshot` y `userAnswersSnapshot`.
- El historial guarda snapshots completos de preguntas y respuestas: cambios en el esquema del banco no rompen intentos antiguos, pero aumentan el tamaño en `localStorage`.
- `state.alias` se actualiza al escribir en el input, no solo al iniciar el test, y siempre con el valor ya saneado por `sanitizeAlias()`.
