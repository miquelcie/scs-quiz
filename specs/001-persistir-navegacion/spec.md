# 001 — Persistir la navegación del examen

- **Estado:** propuesta
- **Fecha:** 2026-11-03
- **Prioridad:** alta
- **Caso de uso:** CU-02 (responder) / CU-03 (recuperar)
- **Componentes:** `js/app.js`, `tests/cu-02`, `tests/cu-03`

## 1. Problema

`persistActiveQuiz()` solo se ejecuta al empezar un simulacro y al responder una opción. Los manejadores de «Anterior» y «Siguiente» (`js/app.js:375-382`) cambian `state.currentIndex` y repintan, pero no guardan nada.

Consecuencia: si el usuario responde la pregunta 1, avanza hasta la 3 y recarga, la recuperación vuelve a la pregunta 1. Además se pierde el tiempo transcurrido desde la última respuesta, porque `scs_active.accumulatedMs` también queda congelado.

## 2. Objetivo

Que el examen guardado refleje siempre la pregunta actual y el tiempo real, de modo que «Continuar examen» retome exactamente donde se dejó.

## 3. Fuera de alcance

- Cambiar el esquema de `scs_active`.
- Sincronizar varias pestañas.
- Persistir en cada *tick* del cronómetro.

## 4. Requisitos

- **R1** — Tras cualquier cambio de `state.currentIndex` (Anterior/Siguiente), llamar a `persistActiveQuiz()`.
- **R2** — Al ocultarse la página (`visibilitychange` con `document.hidden`) o al dispararse `pagehide`, si hay un examen activo, persistir el estado para no perder el tiempo del tramo en curso. Se considera «examen activo» únicamente la pantalla `quiz` con un cuestionario cargado en `state`; la mera existencia de `scs_active` no habilita la escritura.
- **R3** — No persistir cuando no haya un examen activo en el sentido de R2 (por ejemplo, en la portada, en resultados o tras finalizar), aunque `state.questions` conserve el último cuestionario, ni cuando el índice quede fuera de rango.
- **R4** — El snapshot debe contener `questions`, `userAnswers`, `currentIndex` y `accumulatedMs`; el cálculo no debe mutar `state.accumulatedMs` ni duplicar tiempo.
- **R5** — Al recuperar, restaurar el índice guardado; si quedara fuera de rango, aplicar la política del spec 004: recortarlo al rango válido y no romper el render.

## 5. Criterios de aceptación

- [ ] Responder la pregunta 1, avanzar hasta la 3 sin responder, recargar y pulsar «Continuar examen» abre la pregunta 3.
- [ ] La respuesta de la pregunta 1 sigue marcada y el cronómetro muestra el tiempo acumulado antes de la recarga (con tolerancia de 1 s).
- [ ] Retroceder a la pregunta 2 y recargar recupera la pregunta 2.
- [ ] Permanecer 30 s en una pregunta sin responder, recargar y continuar conserva esos 30 s.
- [ ] Tras finalizar el test, permanecer en resultados, cambiar de pestaña y recargar: `scs_active` sigue siendo `null` y no se escribe nada.
- [ ] En la portada con un examen guardado, cambiar de pestaña y recargar: el examen sigue disponible y no se sobrescribe con un snapshot vacío.
- [ ] El tiempo no se duplica ni retrocede al navegar varias veces.

## 6. Verificación

### Automática

- `tests/cu-02`: el snapshot generado tras cambiar de índice conserva `currentIndex` y `accumulatedMs`.
- `tests/cu-03`: round-trip de un snapshot con `currentIndex` distinto de 0.

### Manual (Chrome DevTools)

1. Servir por HTTP y abrir `index.html`.
2. Iniciar un test de 25 preguntas y responder la primera.
3. Avanzar dos veces, esperar unos segundos y recargar.
4. Comprobar el banner de recuperación y pulsar «Continuar examen».
5. Verificar pregunta actual, respuesta marcada, cronómetro y consola sin errores.
6. Repetir retrocediendo y comprobando el tiempo.

## 7. Riesgos y notas

- Escribir en `localStorage` en cada navegación es barato; el coste real está en serializar el snapshot completo de preguntas. Si el banco elegido es «Todas», valorar guardar solo los ids (fuera de alcance).
- `beforeunload` no es fiable en móvil; usar `pagehide`/`visibilitychange`.
