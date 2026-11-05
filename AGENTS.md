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
js/app.js           # Punto de entrada (type="module"): estado, timer, render y eventos
js/engine.js        # Lógica pura del examen (testeable con node --test)
js/questions.js     # Banco de preguntas (export const QUESTION_BANK)
js/storage.js       # Wrapper de localStorage (export const Storage)
specs/NNN-*/        # Especificaciones SDD (una carpeta por cambio)
tests/cu-XX/        # Tests de los casos de uso esenciales
tests/cu-07/        # Ciclo de foco del modal (nextFocusIndex)
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
- Casos cubiertos: CU-01 iniciar simulacro, CU-02 responder, CU-03 recuperar, CU-04 finalizar, CU-05 historial, CU-06 alias y CU-07 ciclo de foco del modal (`nextFocusIndex`).
- Los tests no sustituyen la verificación manual con Chrome DevTools.

## Arquitectura y convenciones

### `js/app.js`

- Un único objeto `state` mutable: `alias`, `questions`, `userAnswers`, `currentIndex`, `accumulatedMs`, `startTimestamp`, `timerInterval`.
- Navegación por **pantallas**, no por rutas: `switchScreen(id)` activa `#screen-<id>` quitando/añadiendo la clase `.active`. Pantallas: `home`, `quiz`, `results`, `history`.
- Renderizado imperativo con `document.createElement`, `DocumentFragment` y `innerHTML`. No hay framework reactivo: tras cambiar el estado hay que volver a renderizar explícitamente.
- Los listeners se registran una sola vez dentro de `DOMContentLoaded` para elementos fijos del HTML. Para elementos generados dinámicamente se enganchan justo después de insertarlos en el DOM.
- El cronómetro se basa en `Date.now()` (no en contar *ticks*) para sobrevivir a la suspensión de la pestaña. `accumulatedMs` guarda el tiempo de tramos anteriores.
- Cada respuesta llama a `persistActiveQuiz()` para permitir la recuperación tras una recarga.
- `startQuiz()` baraja **solo el orden de las preguntas**. Las opciones de cada pregunta conservan el orden exacto de `questions.js`: no aplicar `shuffle` a `q.options`.
- Las opciones del examen son accesibles por teclado: `role="radio"`, `tabindex="0"` y selección con `Enter`/`Espacio`. `renderQuestion(focusOptionIndex)` conserva el foco tras volver a renderizar.
- El modal de confirmación es propio (`showModal(title, msg, onConfirm)` + `#custom-modal`); no usar `alert`/`confirm`/`prompt`. Se oculta con `hidden`, usa `aria-labelledby`/`aria-describedby`, aplica `inert` al fondo (`header`, `main`, `footer`), bloquea el scroll con `body.modal-open`, enfoca «Aceptar», atrapa `Tab`/`Shift+Tab` con `nextFocusIndex()` y escucha `Escape` en `document` mientras está abierto. No se usa `aria-hidden` dinámico.
- Comentarios y textos de UI **en español**.

### `js/engine.js`

- Lógica pura sin DOM ni almacenamiento: `shuffle`, `buildQuiz`, `toggleAnswer`, `buildActiveQuizSnapshot`, `scoreQuiz`, `createAttempt` y formateadores (`formatTime`, `formatPct`, `formatDate`, `escapeHTML`).
- `shuffle()` y `buildQuiz()` aceptan un RNG opcional para tests deterministas; en producción usan `Math.random`.
- No mover aquí estado global, render ni eventos: eso pertenece a `app.js`.

### `js/storage.js`

Claves de `localStorage` (no cambiarlas sin migrar datos):

| Clave         | Contenido                                  |
| ------------- | ------------------------------------------ |
| `scs_alias`   | Alias del aspirante                        |
| `scs_history` | Array de intentos (el más reciente primero) |
| `scs_active`  | Examen en curso (recuperación)             |

Mantener todo acceso a `localStorage` dentro de este módulo; no usarlo directamente en `app.js`.

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
- `state.alias` se actualiza al escribir en el input, no solo al iniciar el test.
