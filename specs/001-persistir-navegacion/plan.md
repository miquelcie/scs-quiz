# Plan 001 — Persistir la navegación del examen

- **Spec:** `specs/001-persistir-navegacion/spec.md`
- **Estado:** propuesto
- **Fecha:** 2026-11-03
- **Dependencias:** 004 (snapshot válido al recuperar)
- **Principios constitucionales:** 2, 3, 4, 5

> Nota de alcance: no se incluye «mapa» ni parámetro «hoy»; no aplican a este cambio (acordado con el usuario).

## 1. Trazabilidad RF → partes

| RF | Dónde se cubre | Verificación |
| --- | --- | --- |
| R1 — persistir tras cambiar de índice | `navegar()` en `js/app.js`; `moveIndex()` en `js/engine.js` | `tests/cu-02` + manual |
| R2 — persistir al ocultar/cerrar la página | listeners `visibilitychange` y `pagehide` en `js/app.js` | manual (recarga y cambio de pestaña) |
| R3 — no persistir sin examen activo | guarda `persistirSiProcede()` + `isQuizInProgress()` | `tests/cu-02` + manual tras finalizar |
| R4 — snapshot completo sin mutar ni duplicar tiempo | `buildActiveQuizSnapshot()` (existente) y cálculo absoluto en `persistirSiProcede()` | `tests/cu-02` y `tests/cu-03` |
| R5 — índice fuera de rango según 004 | `normalizeActiveQuiz()` del plan 004 | `tests/cu-03` (004) |

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
| --- | --- | --- | --- |
| `js/app.js` | modificar | Guarda de persistencia, llamada en Anterior/Siguiente y listeners de ciclo de vida | R1, R2, R3, R4 |
| `js/engine.js` | modificar | `moveIndex()` e `isQuizInProgress()`; se conserva `buildActiveQuizSnapshot()` | R1, R3, R4 |
| `tests/cu-02/responder.test.js` | modificar | Casos de navegación y snapshot | R1, R3, R4 |
| `tests/cu-03/recuperar.test.js` | modificar | Round-trip con índice distinto de 0 | R4, R5 |
| `MEMORY.md` | modificar | Evidencia de la verificación manual y decisión de la guarda | R2, R3 |

No se modifica `js/storage.js`: el esquema de `scs_active` y la clave no cambian.

## 3. Funciones puras necesarias

| Función | Entrada → salida | Responsabilidad | RF |
| --- | --- | --- | --- |
| `buildActiveQuizSnapshot` (ya existe) | `{ questions, userAnswers, currentIndex, accumulatedMs }` → snapshot | Construye el objeto que se persiste sin tocar el estado | R4 |
| `moveIndex` (nueva) | `(currentIndex, total, delta)` → entero | Calcula el índice destino con límites; si `total <= 0`, devuelve 0 | R1 |
| `isQuizInProgress` (nueva) | `(questions, currentIndex)` → booleano | Verdadero si hay preguntas y el índice es entero dentro de rango | R3 |

No se añade ninguna función con la fecha actual como parámetro: el tiempo transcurrido se obtiene en `app.js` con el reloj del navegador, igual que hoy.

## 4. Algoritmo (pseudocódigo)

```text
FUNCIÓN persistirSiProcede():
    SI state.questions no es array O está vacío: SALIR
    SI la pantalla activa no es "quiz": SALIR
    SI NO isQuizInProgress(state.questions, state.currentIndex): SALIR

    transcurrido = 0
    SI state.timerInterval existe:
        transcurrido = ahora - state.startTimestamp

    snapshot = buildActiveQuizSnapshot(
        state.questions,
        state.userAnswers,
        state.currentIndex,
        state.accumulatedMs + transcurrido
    )
    Storage.setActiveQuiz(snapshot)

FUNCIÓN navegar(delta):
    nuevo = moveIndex(state.currentIndex, state.questions.length, delta)
    SI nuevo == state.currentIndex: SALIR
    state.currentIndex = nuevo
    persistirSiProcede()
    renderQuestion()

AL PULSAR "Anterior": navegar(-1)

AL PULSAR "Siguiente":
    SI currentIndex < total - 1: navegar(+1)
    SINO: finishQuiz()

AL OCULTARSE LA PÁGINA (visibilitychange con document.hidden):
    persistirSiProcede()

AL pagehide:
    persistirSiProcede()
```

La persistencia es idempotente: siempre se guarda el tiempo absoluto (`accumulatedMs` + tramo en curso), no un incremento. Varias llamadas seguidas no duplican el tiempo.

## 5. Pintado en la interfaz

- No hay cambios visuales ni nuevos elementos.
- El cronómetro sigue mostrando `accumulatedMs + tramo` con `formatTime()`.
- El banner de recuperación no se toca aquí; su texto lo define el plan 005.
- `renderQuestion()` conserva el comportamiento actual y el foco de la opción.
- La persistencia es silenciosa; los fallos de escritura los gestiona el plan 004.

## 6. Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| La guarda usa «pantalla quiz activa + cuestionario en memoria», no la existencia de `scs_active` | Evita que un `visibilitychange` en la portada escriba un snapshot vacío y destruya el examen guardado | Usar `Storage.getActiveQuiz() != null`: destructivo en la portada y en resultados |
| Se persiste el snapshot completo | Mantiene el esquema actual y la recuperación existente | Guardar solo ids: menos espacio, pero exige migración y cambiar el esquema (fuera de alcance) |
| El tiempo se calcula de forma absoluta sin mutar `state.accumulatedMs` | Evita duplicar tiempo y no detiene el cronómetro visible | Llamar a `stopTimer()` al ocultar: detiene la UI y obliga a reiniciar el intervalo |
| Se usan `visibilitychange` y `pagehide`, no `beforeunload` | Cubren móvil y cierre de pestaña con más fiabilidad | `beforeunload`: poco fiable en móvil y bloquea el ciclo de vida |
| Los listeners se registran una sola vez en `DOMContentLoaded` | Evita duplicados y fugas | Registrar en cada render: multiplica listeners |
| `moveIndex()` es pura | Permite probar los límites sin DOM | Condicionales inline en los handlers: sin cobertura y repetidos |

## 7. Estrategia de tests (`node --test`)

| Archivo | Caso | RF |
| --- | --- | --- |
| `tests/cu-02/responder.test.js` | `moveIndex` avanza, retrocede y se detiene en 0 y en el último | R1 |
| `tests/cu-02/responder.test.js` | `moveIndex` con `total = 0` devuelve 0 y no rompe | R1, R3 |
| `tests/cu-02/responder.test.js` | `isQuizInProgress` con array vacío, índice negativo, índice igual a `length` e índice válido | R3 |
| `tests/cu-02/responder.test.js` | El snapshot conserva `currentIndex` y `accumulatedMs` y no muta las entradas | R4 |
| `tests/cu-03/recuperar.test.js` | `setActiveQuiz` + `getActiveQuiz` con índice 3 y tiempo 65000 | R4, R5 |

Los eventos de ciclo de vida y la pantalla activa son DOM: no se testean con `node --test`; se verifican manualmente.

## 8. Verificación manual y evidencia

1. Servir por HTTP y abrir `index.html`.
2. Iniciar un test de 25 preguntas, responder la primera, avanzar dos veces y recargar.
3. «Continuar examen» debe abrir la pregunta 3, con la respuesta de la 1 marcada y el tiempo acumulado (±1 s).
4. Retroceder a la 2, recargar y comprobar que recupera la 2.
5. Dejar la pestaña oculta 30 s en una pregunta sin responder, volver y recargar: el tiempo debe conservarse.
6. Finalizar el test, quedarse en resultados, cambiar de pestaña y recargar: `scs_active` debe seguir siendo `null`.
7. En la portada con un examen guardado, cambiar de pestaña: el examen no debe perderse.
8. Comprobar consola limpia y vista a 375 px.
9. Registrar el resultado en `MEMORY.md` (bitácora) y en el mensaje del commit.

## 9. Conformidad con la constitución

- **P.2:** cada RF tiene criterio y verificación; no se introduce comportamiento fuera de la spec.
- **P.3:** `localStorage` solo se toca desde `storage.js`; la lógica de índices va a `engine.js`; `app.js` solo orquesta estado, render y eventos.
- **P.4:** verificación manual con flujo completo, consola y 375 px, con evidencia registrada.
- **P.5:** no hay borrados nuevos; se protege el examen en curso y no se escribe sin examen activo.
- **P.1 y P.6:** sin dependencias, sin red, textos y comentarios en español.

## 10. Enmiendas o aclaraciones de spec

- **001 R2/R3:** se define «examen activo» como «pantalla `quiz` activa y cuestionario cargado en `state`». La spec debe recoger esta definición para que el criterio «tras finalizar no se escribe nada» sea verificable.
- **001 R5:** la política concreta de índice fuera de rango se delega en el plan 004; este plan solo garantiza que no se persiste un índice inválido.
