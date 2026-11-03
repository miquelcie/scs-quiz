# 003 — Proteger el examen en curso al empezar otro

- **Estado:** propuesta
- **Fecha:** 2026-11-03
- **Prioridad:** media
- **Caso de uso:** CU-01 (iniciar) / CU-03 (recuperar)
- **Componentes:** `js/app.js`, `tests/cu-03`

## 1. Problema

Cuando existe un examen en curso, la portada muestra el banner de recuperación, pero «Comenzar simulacro» sigue activo. Al pulsarlo, `startQuiz()` genera un cuestionario nuevo y `persistActiveQuiz()` sobrescribe `scs_active` sin avisar.

Consecuencia: se pierde el examen interrumpido y sus respuestas sin que el usuario lo confirme. El botón «Continuar examen» es la única pista de que había un examen guardado.

## 2. Objetivo

Impedir que se descarte un examen en curso de forma accidental, pidiendo confirmación explícita.

## 3. Fuera de alcance

- Guardar varios exámenes simultáneos.
- Sincronización en vivo entre pestañas; solo se relee `scs_active` al pulsar «Comenzar» o «Continuar» (R6).
- Cambiar el esquema de `scs_active`.

## 4. Requisitos

- **R1** — Al pulsar «Comenzar simulacro» con un examen activo válido, mostrar el modal de confirmación antes de crear el nuevo test. Se considera «válido» el snapshot que devuelve `Storage.getActiveQuiz()` conforme al spec 004; un snapshot inválido se trata como inexistente (R7).
- **R2** — El texto debe explicar que el examen actual se descartará y que no podrá recuperarse. Copy normativo: «Hay un examen en curso con respuestas guardadas. Si empiezas uno nuevo, se descartará y no podrás recuperarlo.»
- **R3** — Confirmar descarta el examen anterior (`clearActiveQuiz`) y arranca el nuevo.
- **R4** — Cancelar o pulsar `Escape` no modifica `scs_active` ni el banner; el usuario permanece en la portada. «No modifica» se verifica comparando `localStorage.getItem('scs_active')` antes y después: la cadena debe ser idéntica.
- **R5** — «Continuar examen» no debe mostrar confirmación: reanuda el mismo examen.
- **R6** — Si el examen guardado cambia o desaparece entre la carga de la portada y el clic (por ejemplo, desde otra pestaña), no debe romperse: se relee `scs_active` en el momento del clic y, si ya no hay examen válido, se inicia uno nuevo sin modal.
- **R7** — Un examen guardado inválido se considera inexistente (ver spec 004) y no bloquea el inicio.

## 5. Criterios de aceptación

- [ ] Con un examen en curso, pulsar «Comenzar simulacro» abre un modal y no altera `scs_active`.
- [ ] Cancelar cierra el modal, mantiene el banner y conserva `localStorage.getItem('scs_active')` idéntico antes y después.
- [ ] Confirmar inicia un test nuevo y sobrescribe `scs_active` con el nuevo.
- [ ] «Continuar examen» reanuda sin modal.
- [ ] El banner permanece al cancelar; desaparece al continuar el examen, al confirmar el descarte o al iniciar un test nuevo.
- [ ] Con `scs_active` corrupto o inválido, «Comenzar simulacro» no muestra modal e inicia un test.
- [ ] Si `scs_active` cambia entre la carga y el clic, el clic se resuelve con el valor releído y no rompe la app.
- [ ] La consola queda sin errores.

## 6. Verificación

### Automática

- `tests/cu-03`: `clearActiveQuiz` + `setActiveQuiz` deja el nuevo examen y no el anterior.
- `tests/cu-03`: un `scs_active` inválido se lee como `null`.

### Manual (Chrome DevTools)

1. Iniciar un test, responder una pregunta y recargar.
2. Pulsar «Comenzar simulacro» y comprobar el modal y su texto.
3. Cancelar; comparar `localStorage.getItem('scs_active')` antes y después y verificar que el banner sigue visible.
4. Repetir y confirmar; comprobar que el nuevo test empieza en la pregunta 1 y que `scs_active` contiene el nuevo cuestionario.
5. Pulsar «Continuar examen» y comprobar que no hay modal y que el banner desaparece.
6. Con `scs_active` corrupto (`{`), recargar y pulsar «Comenzar simulacro»: no debe aparecer modal y debe iniciarse un test.
7. Cambiar o borrar `scs_active` desde otra pestaña entre la carga y el clic: la app debe releerlo y no romperse.

## 7. Riesgos y notas

- Depende del spec 006 para que el modal sea accesible.
- El modal actual es de confirmación simple: reutilizarlo evita introducir otro componente.
- R3 exige `clearActiveQuiz()` antes de `startQuiz()` de forma literal. Si el guardado del nuevo examen fallase (R3 de 004), el anterior ya se habría borrado; se mitiga avisando del fallo de escritura y no presentando el nuevo examen como persistido.
