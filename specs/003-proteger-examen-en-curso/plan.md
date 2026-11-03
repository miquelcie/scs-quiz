# Plan 003 — Proteger el examen en curso al empezar otro

- **Spec:** `specs/003-proteger-examen-en-curso/spec.md`
- **Estado:** propuesto
- **Fecha:** 2026-11-03
- **Dependencias:** 004 (validación de `scs_active`), 006 (modal accesible y foco)
- **Principios constitucionales:** 2, 3, 4, 5

> Nota de alcance: no se incluye «mapa» ni parámetro «hoy»; no aplican a este cambio (acordado con el usuario).

## 1. Trazabilidad RF → partes

| RF | Dónde se cubre | Verificación |
| --- | --- | --- |
| R1 — confirmar antes de descartar un examen válido | `alPulsarComenzar()` en `js/app.js` | manual + `tests/cu-03` (lectura válida) |
| R2 — texto que explica el descarte | constante de texto en `js/app.js` | manual |
| R3 — confirmar descarta y arranca | `confirmarDescarte()` en `js/app.js` | manual + `tests/cu-03` |
| R4 — cancelar/Escape no toca `scs_active` | `showModal` + callback no-op | manual |
| R5 — «Continuar examen» no confirma | handler existente de `btn-resume-quiz` | manual |
| R6 — el guardado desaparece entre carga y clic | relectura en `alPulsarComenzar()` | manual |
| R7 — examen inválido = inexistente | `Storage.getActiveQuiz()` del plan 004 | `tests/cu-03` |

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
| --- | --- | --- | --- |
| `js/app.js` | modificar | Relectura del examen activo en el clic, modal de confirmación y arranque | R1–R7 |
| `tests/cu-03/recuperar.test.js` | modificar | Lectura inválida como `null`, borrado y sustitución del examen | R3, R7 |
| `MEMORY.md` | modificar | Evidencia de la verificación manual y del texto del modal | R2, R4 |

No se modifica `js/storage.js` ni el esquema de `scs_active`. El modal se reutiliza; su accesibilidad corresponde al plan 006.

## 3. Funciones puras necesarias

No se añaden funciones puras nuevas. La decisión «¿hay examen válido?» la resuelve `Storage.getActiveQuiz()` (plan 004), que ya devuelve `null` para datos inválidos.

| Función | Entrada → salida | Responsabilidad | RF |
| --- | --- | --- | --- |
| `Storage.getActiveQuiz` (004) | — → snapshot o `null` | Fuente de verdad de «examen válido» | R1, R6, R7 |
| `Storage.clearActiveQuiz` (existente) | — → void | Descarta el examen confirmado | R3 |
| `buildQuiz` (existente) | `(banco, cantidad)` → preguntas | Crea el cuestionario nuevo | R3 |

## 4. Algoritmo (pseudocódigo)

```text
TEXTO_DESCARTE = "Hay un examen en curso con respuestas guardadas.
Si empiezas uno nuevo, se descartará y no podrás recuperarlo."

FUNCIÓN alPulsarComenzar():
    activo = Storage.getActiveQuiz()      // relectura en el clic; 004 valida
    SI activo == null:
        startQuiz()                       // R6/R7: se trata como inexistente
    SINO:
        showModal("Examen en curso", TEXTO_DESCARTE, confirmarDescarte)

FUNCIÓN confirmarDescarte():
    Storage.clearActiveQuiz()
    startQuiz()                           // crea y persiste el nuevo

AL PULSAR "Continuar examen":
    activo = Storage.getActiveQuiz()
    SI activo == null: startQuiz()        // R6/R7
    SINO: startQuiz(activo)               // R5: sin modal

AL CANCELAR O Escape:
    no hacer nada                          // R4; el banner y scs_active siguen
```

`showModal` no modifica `scs_active` por sí mismo; solo el callback de confirmación lo hace.

## 5. Pintado en la interfaz

- El modal reutiliza `#custom-modal`, `#modal-title`, `#modal-msg`, `#modal-cancel` y `#modal-confirm`.
- Título: «Examen en curso».
- Mensaje: el `TEXTO_DESCARTE` anterior (dos frases; explica la pérdida).
- Botones: «Cancelar» y «Aceptar» (textos actuales del componente).
- Al cancelar, el banner de recuperación permanece visible y no se repinta.
- Al confirmar, `startQuiz()` oculta el banner, cambia a `quiz` y pinta la pregunta 1.
- El foco inicial, el *focus trap* y la restauración los define el plan 006.

## 6. Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| Releer `scs_active` en el clic, no usar el estado cacheado de la carga | Cubre R6 y evita decidir con un banner obsoleto | Usar la variable `activeQuiz` de `DOMContentLoaded`: no detecta cambios de otra pestaña ni descartes previos |
| Pedir confirmación con el modal existente | Reutiliza un componente ya probado y evita duplicar diálogos | Deshabilitar «Comenzar simulacro» mientras hay examen: impide empezar otro sin pasar por «Descartar», peor UX |
| Confirmar ejecuta `clearActiveQuiz()` y luego `startQuiz()` | Cumple R3 al pie de la letra | Confiar solo en la sobrescritura de `setActiveQuiz`: más atómica, pero incumple R3 y deja el borrado implícito |
| Un examen inválido se trata como inexistente | Cumple R7 y evita bloquear el inicio por datos corruptos | Mostrar un modal de error: añade un flujo que la spec no pide |
| «Continuar examen» no confirma | Cumple R5; reanudar no destruye nada | Confirmar también al continuar: ruido innecesario |
| El texto vive en una constante de `app.js` | Es copy de interfaz; no es lógica de negocio | Moverlo a `engine.js`: mezcla responsabilidades (el plan 005 solo justifica el texto del banner por RF explícito) |

## 7. Estrategia de tests (`node --test`)

| Archivo | Caso | RF |
| --- | --- | --- |
| `tests/cu-03/recuperar.test.js` | `getActiveQuiz` devuelve `null` con JSON inválido o forma inválida | R7 |
| `tests/cu-03/recuperar.test.js` | `clearActiveQuiz` + `setActiveQuiz` deja el nuevo examen y no el anterior | R3 |
| `tests/cu-03/recuperar.test.js` | Tras `clearActiveQuiz`, `getActiveQuiz` es `null` | R3 |

El flujo del modal (R1, R2, R4, R5, R6) es DOM y se verifica manualmente. No se simula el modal en `node --test` sin un arnés DOM, que la constitución no permite instalar.

## 8. Verificación manual y evidencia

1. Iniciar un test, responder una pregunta y recargar.
2. Pulsar «Comenzar simulacro»: debe abrirse el modal y `localStorage.getItem('scs_active')` no debe cambiar.
3. Cancelar: el banner sigue visible y `scs_active` es idéntico (comparar la cadena antes/después).
4. Repetir y confirmar: el nuevo test empieza en la pregunta 1 y `scs_active` contiene el nuevo cuestionario.
5. Pulsar «Continuar examen»: no debe aparecer modal.
6. Con `scs_active` corrupto (`{`), recargar y pulsar «Comenzar simulacro»: no debe aparecer modal y debe iniciarse un test.
7. Cambiar `scs_active` desde otra pestaña entre la carga y el clic: no debe romperse.
8. Consola limpia, 375 px y evidencia en `MEMORY.md`.

## 9. Conformidad con la constitución

- **P.2:** R1–R7 tienen criterio y verificación; el texto del modal se fija en este plan.
- **P.3:** el modal y el flujo viven en `app.js`; el almacenamiento sigue encapsulado en `storage.js`; no hay lógica de negocio en HTML/CSS.
- **P.4:** verificación manual con flujo completo, consola y 375 px; evidencia registrada.
- **P.5:** se añade una confirmación explícita antes de destruir datos; no hay borrado silencioso.
- **P.1 y P.6:** sin dependencias y textos en español.

## 10. Enmiendas o aclaraciones de spec

- **003 criterio del banner:** «desaparece solo tras confirmar el descarte o al iniciar el nuevo test» es incorrecto: también desaparece al pulsar «Continuar examen» (`startQuiz`) y al confirmar «Descartar examen». La spec debe decir: «permanece al cancelar; desaparece al continuar, al descartar o al iniciar un test nuevo».
- **003 R4 «byte a byte»:** se concreta como comparación de `localStorage.getItem('scs_active')` antes y después de cancelar.
- **003 R1/R7:** «válido» se define por `Storage.getActiveQuiz()` según el plan 004.
- **003 R3:** se mantiene `clearActiveQuiz()` antes de `startQuiz()` por exigencia literal; queda documentado que un fallo de escritura posterior puede perder el examen anterior (lo mitiga el aviso del plan 004).
