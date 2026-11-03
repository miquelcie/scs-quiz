# Plan 005 — Textos y recuento del banner de recuperación

- **Spec:** `specs/005-textos-recuperacion/spec.md`
- **Estado:** propuesto
- **Fecha:** 2026-11-03
- **Dependencias:** 004 (snapshot y respuestas saneadas)
- **Principios constitucionales:** 2, 3, 4, 5, 6

> Nota de alcance: no se incluye «mapa» ni parámetro «hoy»; no aplican a este cambio (acordado con el usuario).

## 1. Trazabilidad RF → partes

| RF | Dónde se cubre | Verificación |
| --- | --- | --- |
| R1 — `countAnswered` puro | `js/engine.js` | `tests/cu-03` |
| R2 — `formatRecoveryInfo` puro | `js/engine.js` | `tests/cu-03` |
| R3 — textos 0 / 1 / 2+ | `formatRecoveryInfo` | `tests/cu-03` |
| R4 — `app.js` usa la función | `DOMContentLoaded` de `js/app.js` | manual + inspección |
| R5 — ignorar ids ajenos y valores vacíos | `countAnswered` | `tests/cu-03` |

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
| --- | --- | --- | --- |
| `js/engine.js` | modificar | `countAnswered`, `formatRecoveryInfo` y pluralización interna | R1, R2, R3, R5 |
| `js/app.js` | modificar | Sustituir el texto construido a mano por `formatRecoveryInfo()` | R4 |
| `tests/cu-03/recuperar.test.js` | modificar | Casos de recuento y textos | R1, R2, R3, R5 |
| `MEMORY.md` | modificar | Evidencia manual de los tres textos | R3, R4 |

No se toca `index.html` ni `css/styles.css`: el banner y su estilo no cambian.

## 3. Funciones puras necesarias

| Función | Entrada → salida | Responsabilidad | RF |
| --- | --- | --- | --- |
| `countAnswered` (nueva) | `(questions, answers)` → entero | Cuenta preguntas del snapshot con respuesta válida | R1, R5 |
| `formatRecoveryInfo` (nueva) | `(questions, answers)` → texto | Devuelve el mensaje completo del banner | R2, R3 |
| `pluralize` (interna) | `(cantidad, singular, plural)` → texto | Resuelve «1 pregunta» / «N preguntas» y «1 respondida» / «N respondidas» | R3 |

Ninguna toca DOM, storage ni la fecha actual.

## 4. Algoritmo (pseudocódigo)

```text
FUNCIÓN countAnswered(questions, answers):
    SI questions no es array: DEVOLVER 0
    SI answers no es objeto plano: DEVOLVER 0
    contador = 0
    PARA CADA pregunta EN questions:
        valor = answers[pregunta.id]
        SI valor es string no vacía
           Y valor pertenece a los ids de pregunta.options:
            contador = contador + 1
    DEVOLVER contador

FUNCIÓN formatRecoveryInfo(questions, answers):
    SI questions no es array O está vacío: DEVOLVER ""
    total = questions.length
    respondidas = countAnswered(questions, answers)

    base = "Hay un examen de " + pluralize(total, "pregunta", "preguntas") + " en curso"

    SI respondidas == 0:
        DEVOLVER base + "."
    SI respondidas == 1:
        DEVOLVER base + " (1 respondida)."
    DEVOLVER base + " (" + respondidas + " respondidas)."
```

Se pluraliza también el total (`1 pregunta`, no `1 preguntas`) para cubrir el caso límite de un test de una sola pregunta.

## 5. Pintado en la interfaz

- En `DOMContentLoaded`, si `Storage.getActiveQuiz()` devuelve un snapshot válido:
  - `#recovery-info` recibe `formatRecoveryInfo(activeQuiz.questions, activeQuiz.userAnswers)` mediante `textContent`;
  - `#recovery-banner` se muestra con `hidden = false`.
- No se usa `innerHTML`: el texto es plano y no necesita escapado adicional.
- El aspecto, la posición y los botones del banner no cambian.
- Si el snapshot es inválido, `getActiveQuiz()` devuelve `null` y el banner no se muestra (plan 004).

## 6. Decisiones técnicas

| Decisión | Justificación | Alternativa descartada |
| --- | --- | --- |
| `countAnswered` y `formatRecoveryInfo` viven en `engine.js` | Lo exige R1/R2 y permite tests puros sin DOM | Devolver solo el número desde `engine.js` y formatear en `app.js`: mejor separación, pero incumple R2 |
| Se valida que la opción exista, no solo que el id de pregunta exista | Coincide con el saneado de 004 y evita contar respuestas imposibles | Contar cualquier valor no vacío: banner y corrección podrían discrepar |
| Se pluraliza también el número de preguntas | Evita «1 preguntas» en un test de una pregunta, caso que R3 no cubre | Aplicar R3 literal: texto gramaticalmente incorrecto en N=1 |
| `formatRecoveryInfo` devuelve cadena vacía sin preguntas | Función pura total, sin excepciones; la app no la llama en ese caso | Lanzar error o devolver `null`: obliga a comprobar tipos en `app.js` |
| El texto se inserta con `textContent` | Elimina cualquier riesgo de HTML y cumple P.5 | `innerHTML`: innecesario y peligroso |
| El texto se calcula al cargar, no en cada respuesta | El banner solo se ve en la portada; no hay actualización en vivo | Suscribirse a cambios de storage: fuera de alcance (sin sincronización entre pestañas) |

## 7. Estrategia de tests (`node --test`)

| Archivo | Caso | RF |
| --- | --- | --- |
| `tests/cu-03/recuperar.test.js` | 0 respuestas → texto sin paréntesis | R1, R3 |
| `tests/cu-03/recuperar.test.js` | 1 respuesta → «(1 respondida)» | R1, R3 |
| `tests/cu-03/recuperar.test.js` | 2 y 3 respuestas → «(2 respondidas)» y «(3 respondidas)» | R1, R3 |
| `tests/cu-03/recuperar.test.js` | Respuesta con id de pregunta ajeno → no incrementa | R5 |
| `tests/cu-03/recuperar.test.js` | Respuesta con opción inexistente → no incrementa | R1, R5 |
| `tests/cu-03/recuperar.test.js` | Valores `""`, `null`, `undefined` y número → no incrementan | R5 |
| `tests/cu-03/recuperar.test.js` | `answers` `null` o array → 0, sin excepción | R1 |
| `tests/cu-03/recuperar.test.js` | `questions` vacío → `""` | R2 |
| `tests/cu-03/recuperar.test.js` | Un sola pregunta y una respuesta → «1 pregunta … (1 respondida)» | R3 |

El pintado real del banner se verifica manualmente.

## 8. Verificación manual y evidencia

1. Iniciar un test de 25 preguntas sin responder, recargar y comprobar el texto sin paréntesis.
2. Responder una, recargar y comprobar «(1 respondida)».
3. Responder otra, recargar y comprobar «(2 respondidas)».
4. Iniciar un test de 1 pregunta, responderla, recargar y comprobar «1 pregunta … (1 respondida)».
5. Comprobar consola limpia, 375 px y evidencia en `MEMORY.md`.

## 9. Conformidad con la constitución

- **P.2:** R1–R5 con criterios y tests; el texto exacto se fija aquí.
- **P.3:** `engine.js` contiene lógica pura; `app.js` solo asigna el texto. La generación de copy en `engine.js` está impuesta por R2 y se registra como decisión, no como lógica de negocio nueva.
- **P.4:** tests nativos + verificación manual con 375 px y evidencia.
- **P.5:** `textContent` y datos saneados por 004; sin red.
- **P.1 y P.6:** sin dependencias y textos en español.

## 10. Enmiendas o aclaraciones de spec

- **005 R3:** los textos deben pluralizar también `N` («1 pregunta»), no solo `M`. La spec solo define «1 respondida»; se amplía para evitar «1 preguntas».
- **005 R2:** se concreta el contrato: `formatRecoveryInfo` devuelve `""` si no hay preguntas y nunca lanza.
- **005 R1:** «respuesta no vacía» se define como string no vacía que además pertenece a las opciones de la pregunta.
