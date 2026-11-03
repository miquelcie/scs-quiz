# 005 — Textos y recuento del banner de recuperación

- **Estado:** propuesta
- **Fecha:** 2026-11-03
- **Prioridad:** baja
- **Caso de uso:** CU-03 (recuperar)
- **Componentes:** `js/engine.js`, `js/app.js`, `tests/cu-03`

## 1. Problema

El banner de recuperación se construye en `js/app.js:362` con el texto fijo «respondidas»:

```js
`Hay un examen de ${n} preguntas en curso (${Object.keys(activeQuiz.userAnswers || {}).length} respondidas).`
```

Con una sola respuesta produce «(1 respondidas)». Además, el recuento usa todas las claves de `userAnswers`, incluidas las que no pertenecen al cuestionario, por lo que puede no coincidir con las preguntas realmente respondidas.

## 2. Objetivo

Mostrar un texto correcto en singular y plural y un recuento fiable de preguntas respondidas.

## 3. Fuera de alcance

- Cambiar el diseño del banner.
- Alterar cuándo se muestra.

## 4. Requisitos

- **R1** — Extraer a `js/engine.js` una función pura `countAnswered(questions, answers)` que cuente solo preguntas del snapshot con respuesta válida. Una respuesta es válida si es un string no vacío que además pertenece a los `id` de las opciones de su pregunta.
- **R2** — Extraer a `js/engine.js` una función pura `formatRecoveryInfo(questions, answers)` (o equivalente) que devuelva el texto completo del banner. Contrato: devuelve `""` si no hay preguntas y nunca lanza excepciones, sea cual sea el tipo de sus argumentos.
- **R3** — Textos (se pluraliza `N` en las tres formas y `M` en la de 2 o más):
  - 0 respondidas: `Hay un examen de N preguntas en curso.` (con `N = 1`: `Hay un examen de 1 pregunta en curso.`)
  - 1 respondida: `Hay un examen de N preguntas en curso (1 respondida).` (con `N = 1`: `Hay un examen de 1 pregunta en curso (1 respondida).`)
  - 2 o más: `Hay un examen de N preguntas en curso (M respondidas).`
- **R4** — `js/app.js` debe usar la función extraída y no construir el texto a mano.
- **R5** — El recuento debe ignorar ids ajenos y valores vacíos.

## 5. Criterios de aceptación

- [ ] Un examen con 0 respuestas no muestra paréntesis de recuento.
- [ ] Con una respuesta muestra «(1 respondida)».
- [ ] Con dos o más muestra «(M respondidas)».
- [ ] Un examen de una sola pregunta muestra «1 pregunta», no «1 preguntas».
- [ ] Una respuesta con id inexistente o con una opción inexistente no incrementa el recuento.
- [ ] Valores vacíos, `null`, `undefined` o numéricos no incrementan el recuento y no lanzan.
- [ ] Sin preguntas, `formatRecoveryInfo` devuelve `""` y no lanza.
- [ ] El texto se actualiza al recargar con el estado guardado.
- [ ] `npm test` sigue en verde.

## 6. Verificación

### Automática

- `tests/cu-03/recuperar.test.js`: casos 0, 1, 2 y 3 respuestas; respuesta con id ajeno; respuesta con opción inexistente; valores vacíos o no string; `answers` nulo o array; `questions` vacío; examen de una sola pregunta.

### Manual (Chrome DevTools)

1. Iniciar un test de 25 preguntas.
2. Sin responder, recargar y comprobar el banner.
3. Responder una y recargar; comprobar «(1 respondida)».
4. Responder otra y recargar; comprobar «(2 respondidas)».
5. Iniciar un test de una pregunta, responderla y recargar; comprobar «1 pregunta … (1 respondida)».

## 7. Riesgos y notas

- Mantener el texto en una función pura evita volver a duplicar la lógica entre `app.js` y los tests.
