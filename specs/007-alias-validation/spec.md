# 007 — Validación del alias de usuario

- **Estado:** propuesta
- **Fecha:** 2026-11-05
- **Prioridad:** baja (calidad de datos y accesibilidad)
- **Caso de uso:** CU-06 (alias)
- **Componentes:** `js/engine.js`, `js/app.js`, `index.html`, `tests/cu-06/alias.test.js`

## 1. Problema

El campo `#input-alias` acepta cualquier texto: espacios, puntos, arrobas, emojis y otros símbolos. El único límite actual es `maxlength="30"` en `index.html`. Además, el alias se guarda en `scs_alias` en cada `input` sin validar ni normalizar (`js/app.js:484-488`), por lo que el valor mostrado, el almacenado y el que acaba en los intentos del historial pueden contener caracteres que no corresponden a un nombre de usuario.

El propio `placeholder` del campo, «Ej.: María Rodríguez», incluye un espacio y contradice la regla que se quiere implantar. También pueden existir alias antiguos guardados con espacios o símbolos que ya no cumplan la nueva regla.

## 2. Objetivo

Que el alias sea siempre un nombre de usuario válido: letras Unicode (incluidas tildes y `ñ`), dígitos, guion y guion bajo; sin espacios ni otros caracteres especiales. El alias seguirá siendo opcional y tendrá un máximo de 30 caracteres.

## 3. Fuera de alcance

- Autenticación, identidad o unicidad de alias.
- Validación en servidor o llamadas de red.
- Cambiar las claves de `localStorage` (`scs_alias`, `scs_history`, `scs_active`).
- Reescribir los alias ya guardados dentro de intentos del historial.
- Rediseñar la pantalla de inicio o el formulario.

## 4. Requisitos

### Validación y normalización

- **R1** — El conjunto de caracteres permitidos es `\p{L}` (letras Unicode, incluidas tildes y `ñ`), `\p{N}` (dígitos), `_` y `-`. La expresión de referencia es `^[\p{L}\p{N}_-]+$` con flag `u`.
- **R2** — El alias no puede superar los 30 caracteres, igual que el `maxlength` actual del campo. Un valor más largo se recorta a 30 tras eliminar los caracteres no permitidos.
- **R3** — El alias vacío es válido porque el campo es opcional. Se sigue mostrando «Aspirante» como valor de presentación y no se muestra ningún error.
- **R4** — Al escribir o pegar, los caracteres no permitidos y los espacios se eliminan antes de actualizar el estado. No se acepta un valor inválido de forma transitoria en `state.alias` ni en `localStorage`.
- **R5** — El valor saneado actualiza de forma coordinada el propio input, `state.alias`, el texto de `#display-alias` y `scs_alias` mediante `Storage.setAlias()`.
- **R6** — Al cargar la aplicación, un alias antiguo guardado con caracteres no permitidos se sanea y se vuelve a persistir con el valor normalizado. La aplicación no debe fallar ante alias corruptos o de tipos inesperados.

### Lógica y pruebas

- **R7** — La validación y el saneado viven en `js/engine.js` como funciones puras, sin DOM ni almacenamiento: `sanitizeAlias()`, `isValidAlias()` y la constante `ALIAS_MAX_LENGTH`.
- **R8** — La interfaz explica la regla con un texto de ayuda asociado al campo mediante `aria-describedby`, y el `placeholder` usa un ejemplo válido.

### Datos y compatibilidad

- **R9** — Los intentos ya guardados en el historial conservan su alias original; solo los intentos nuevos usan el alias saneado. No se migran ni se reescriben snapshots históricos.
- **R10** — No se añaden dependencias, CDN, `eval` ni peticiones de red. La validación funciona completamente offline.
- **R11** — Los tests de las funciones puras se escriben antes que la implementación y cubren casos válidos, inválidos, vacíos, tipos inesperados y longitud máxima.

### Requisitos no funcionales

- **N1** — La validación debe ser imperceptible para el usuario: sin recargas, sin diálogos y sin bloqueos del campo.
- **N2** — El campo debe seguir siendo accesible por teclado y compatible con lector de pantalla; el texto de ayuda debe estar asociado al input.
- **N3** — Debe funcionar en los navegadores actuales que ya soportan módulos ES y `\p{L}` con flag `u`.
- **N4** — El filtrado debe conservar las letras acentuadas y la `ñ`, que forman parte de nombres reales en español.
- **N5** — El código y los comentarios mantienen el estilo del proyecto: lógica pura en `engine.js`, estado y eventos en `app.js` e interfaz en `index.html`.

## 5. Criterios de aceptación

- [ ] Escribir un espacio en el alias no lo incorpora al valor del campo.
- [ ] Pegar `ana@example.com` deja un alias permitido, sin `@`, sin punto y sin espacios.
- [ ] Pegar `María Rodríguez` elimina el espacio y conserva `María` y `Rodríguez` con sus tildes.
- [ ] `maria_rodriguez-01` y `María_Ñandú` son alias válidos.
- [ ] Emojis, `#`, `/`, `\`, `?`, `%` y otros símbolos quedan fuera del valor.
- [ ] Un alias vacío sigue siendo válido y la interfaz muestra «Aspirante».
- [ ] Un alias de 31 caracteres válidos se recorta a 30.
- [ ] Tras recargar, `scs_alias`, el input y `#display-alias` contienen el valor saneado.
- [ ] Un alias antiguo con espacios o símbolos se normaliza al cargar y se vuelve a guardar.
- [ ] Los intentos anteriores del historial conservan su alias original.
- [ ] El campo muestra un texto de ayuda accesible y un `placeholder` con un ejemplo válido.
- [ ] La consola no muestra errores y el flujo completo funciona a 375 px.

## 6. Verificación

### Automática

Se añaden tests de `sanitizeAlias()` e `isValidAlias()` en `tests/cu-06/alias.test.js` y se ejecutan con:

```bash
node --test tests/cu-06/alias.test.js
node --test
```

Deben cubrirse los casos de R1–R3, R7, R11 y N4. Los tests se escriben antes de la implementación y deben fallar inicialmente por las exportaciones ausentes.

### Manual (Chrome DevTools)

1. Cargar la app con `scs_alias` vacío; comprobar que el campo está vacío y se muestra «Aspirante».
2. Escribir un espacio, `@`, un punto y un emoji; comprobar que desaparecen del input.
3. Pegar un alias con espacios y comprobar el resultado saneado y la posición del cursor.
4. Escribir un alias con tildes y `ñ`; comprobar que se conserva.
5. Comprobar el recorte a 30 caracteres.
6. Recargar y verificar que `scs_alias`, el input y `#display-alias` coinciden.
7. Sembrar un alias antiguo inválido y recargar; comprobar la normalización y la nueva escritura en `localStorage`.
8. Finalizar un test y comprobar que el alias saneado aparece en resultados e historial.
9. Revisar un intento anterior y verificar que su alias no ha cambiado.
10. Revisar el árbol de accesibilidad del campo y su texto de ayuda; repetir a 375 px y comprobar la consola.

## 7. Restricciones y dependencias

- **Depende de 004** para la lectura y escritura defensivas de `localStorage`.
- **Depende de CU-06** y de su archivo de tests existente.
- Las claves de `localStorage` son contrato de datos: no se cambian.
- No se toca `questions.js` ni el esquema de los intentos.
- No se implementa autenticación ni comprobación de alias duplicados.
- No se añaden dependencias ni se usa `eval`/`new Function`.
- El filtrado en vivo debe convivir con la composición de teclado (tildes, `ñ` y métodos de entrada); se verificará manualmente antes de cerrar el cambio.

## 8. Riesgos y notas

- **Compatibilidad Unicode:** `\p{L}` y `\p{N}` requieren navegadores y Node actuales; el proyecto ya usa ES6+ y Node 24, así que no se prevé un problema. Si se necesitara compatibilidad antigua, habría que ampliar el rango manualmente.
- **Caret al filtrar:** reasignar `input.value` puede llevar el cursor al final. La implementación debe recolocarlo en la posición equivalente para no interrumpir la escritura.
- **Alias heredados:** normalizar un alias antiguo puede cambiar lo que el usuario ve (por ejemplo, «María Rodríguez» pasa a «MaríaRodríguez»). Es una consecuencia aceptada de la nueva regla y debe quedar registrada en `MEMORY.md`.
- **Historial inmutable:** los intentos antiguos no se reescriben; la regla solo afecta a valores nuevos y al alias actual.
- **`maxlength` UTF-16:** el atributo HTML cuenta unidades UTF-16. Como los emojis se eliminan y las letras españolas ocupan una unidad, el comportamiento esperado no se ve afectado en la práctica.
