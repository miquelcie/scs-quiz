# Plan 002 — Refrescar «Último resultado» al configurar otro test

- **Spec:** `specs/002-refrescar-ultimo-resultado/spec.md`
- **Estado:** propuesto
- **Fecha:** 2026-11-03
- **Dependencias:** 006 (orden foco/render al cambiar de pantalla)
- **Principios constitucionales:** 2, 3, 4, 5

> Nota de alcance: no se incluye «mapa» ni parámetro «hoy»; no aplican a este cambio (acordado con el usuario).

## 1. Trazabilidad RF → partes

| RF | Dónde se cubre | Verificación |
| --- | --- | --- |
| R1 — «Configurar otro test» refresca la tarjeta | `volverAlInicio()` en `js/app.js` | manual |
| R2 — muestra nota, aciertos, fecha y tiempo del último intento | `renderLastAttempt()` (existente) | manual + `tests/cu-05` (orden) |
| R3 — no duplica ni modifica el historial | `volverAlInicio()` no escribe en storage | `tests/cu-05` + manual |
| R4 — estado vacío sin historial | `renderLastAttempt()` (existente) | manual |
| R5 — «Volver al inicio» mantiene comportamiento | misma función `volverAlInicio()` | manual |

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
| --- | --- | --- | --- |
| `js/app.js` | modificar | Nueva función `volverAlInicio()`; enlazar las tres salidas de resultados/historial | R1, R3, R4, R5 |
| `tests/cu-05/historial.test.js` | sin cambios funcionales | Ya cubre que el intento más reciente queda primero, que es la fuente de la tarjeta | R2, R3 |
| `MEMORY.md` | modificar | Evidencia de la verificación manual | R1, R5 |

No se crean módulos nuevos. `js/engine.js` no cambia: no hay lógica de negocio nueva.

## 3. Funciones puras necesarias

No se añaden funciones puras. La única regla es «la tarjeta muestra `history[0]`», ya implementada por `renderLastAttempt()` y ya cubierta por el test de orden de `Storage.getHistory()`.

| Función | Entrada → salida | Responsabilidad | RF |
| --- | --- | --- | --- |
| `Storage.getHistory` (existente) | — → array ordenado | Devuelve el historial con el más reciente primero | R2, R3 |
| `renderLastAttempt` (existente) | — → DOM | Pinta la tarjeta o el estado vacío | R2, R4 |

## 4. Algoritmo (pseudocódigo)

```text
FUNCIÓN volverAlInicio():
    renderLastAttempt()          // primero el contenido
    switchScreen('home')         // después el foco (plan 006)

AL PULSAR "Configurar otro test": volverAlInicio()
AL PULSAR "Volver al inicio":     volverAlInicio()
AL PULSAR "Volver" desde historial: volverAlInicio()
```

`renderLastAttempt()` consulta el historial en cada llamada; no se cachea el intento en `state`. Si el historial está vacío, pinta el estado vacío actual.

## 5. Pintado en la interfaz

- Se reutiliza la tarjeta «Último resultado» sin cambios de diseño.
- Campos: porcentaje (`formatPct`), aciertos (`hits` de `totalQuestions`), fecha (`formatDate`) y tiempo (`formatTime`), más el botón «Revisar intento».
- Si el usuario revisa un intento antiguo desde el historial y pulsa «Configurar otro test», la portada muestra el **último intento del historial**, no el revisado. Es la semántica de «Último resultado».
- Sin historial: mensaje vacío existente.

## 6. Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| Unificar las tres salidas en `volverAlInicio()` | Evita que las rutas vuelvan a divergir (riesgo señalado en la spec) | Parchear solo `btn-restart-from-res`: mínima, pero deja tres rutas con el mismo comportamiento duplicado |
| Renderizar antes de cambiar de pantalla | El plan 006 mueve el foco al contenedor; si se cambia antes de pintar, el lector anuncia contenido obsoleto | `switchScreen` y luego `renderLastAttempt`: orden actual de `btn-home-from-res`, incompatible con 006 R12 |
| Mostrar siempre `history[0]` | «Último resultado» debe ser el último, no el que se estaba revisando | Guardar el intento revisado en `state` y mostrarlo: confunde la tarjeta y añade estado |
| No extraer un selector puro `latestAttempt()` | Es un acceso a `history[0]`; el orden ya está cubierto por CU-05 | Añadir una función trivial solo para test: ruido sin regla de negocio |
| Leer el historial en cada render | La tarjeta refleja borrados y nuevos intentos sin sincronización manual | Cachear en `state`: se queda obsoleta tras eliminar o borrar |

## 7. Estrategia de tests (`node --test`)

| Archivo | Caso | RF |
| --- | --- | --- |
| `tests/cu-05/historial.test.js` | El intento más reciente queda primero tras dos guardados | R2, R3 |
| `tests/cu-05/historial.test.js` | Eliminar un intento no altera el orden de los restantes | R3 |

No hay test DOM para el clic ni para el pintado: se verifican manualmente. No se añaden tests artificiales de una función que no existe.

## 8. Verificación manual y evidencia

1. Borrar el historial y terminar un simulacro.
2. Comprobar la tarjeta en resultados.
3. Pulsar «Configurar otro test»: la portada debe mostrar la nota del intento recién terminado.
4. Comprobar que el historial sigue teniendo un solo intento.
5. Repetir con «Volver al inicio».
6. Repetir desde el historial: abrir un intento antiguo y volver; debe mostrarse el último, no el revisado.
7. Sin historial, ambas rutas deben mostrar el estado vacío.
8. Consola limpia, 375 px y evidencia en `MEMORY.md`.

## 9. Conformidad con la constitución

- **P.2:** el cambio se limita a R1–R5; no altera el historial ni el diseño.
- **P.3:** `app.js` solo orquesta render y navegación; no hay `localStorage` fuera de `storage.js` ni lógica de negocio en HTML/CSS.
- **P.4:** verificación manual con flujo completo, consola y 375 px; evidencia registrada.
- **P.5:** no hay borrados ni escrituras nuevas; el historial se conserva.
- **P.1 y P.6:** sin dependencias y textos en español.

## 10. Enmiendas o aclaraciones de spec

- **002 R2:** «intento recién finalizado» se interpreta como «último intento del historial» cuando se llega desde la revisión de un intento antiguo. Conviene precisarlo en la spec para que el criterio sea único.
