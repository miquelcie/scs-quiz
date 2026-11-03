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
- Sincronización entre pestañas.
- Cambiar el esquema de `scs_active`.

## 4. Requisitos

- **R1** — Al pulsar «Comenzar simulacro» con un examen activo válido, mostrar el modal de confirmación antes de crear el nuevo test.
- **R2** — El texto debe explicar que el examen actual se descartará.
- **R3** — Confirmar descarta el examen anterior (`clearActiveQuiz`) y arranca el nuevo.
- **R4** — Cancelar o pulsar `Escape` no modifica `scs_active` ni el banner; el usuario permanece en la portada.
- **R5** — «Continuar examen» no debe mostrar confirmación: reanuda el mismo examen.
- **R6** — Si el examen guardado desaparece entre la carga y el clic (otra pestaña), no debe romperse: se tratará como «sin examen» y se iniciará uno nuevo.
- **R7** — Un examen guardado inválido se considera inexistente (ver spec 004) y no bloquea el inicio.

## 5. Criterios de aceptación

- [ ] Con un examen en curso, pulsar «Comenzar simulacro» abre un modal y no altera `scs_active`.
- [ ] Cancelar cierra el modal, mantiene el banner y conserva `scs_active` byte a byte.
- [ ] Confirmar inicia un test nuevo y sobrescribe `scs_active` con el nuevo.
- [ ] «Continuar examen» reanuda sin modal.
- [ ] El banner desaparece solo tras confirmar el descarte o al iniciar el nuevo test.
- [ ] La consola queda sin errores.

## 6. Verificación

### Automática

- `tests/cu-03`: `clearActiveQuiz` + `setActiveQuiz` deja el nuevo examen y no el anterior.
- `tests/cu-03`: un `scs_active` inválido se lee como `null`.

### Manual (Chrome DevTools)

1. Iniciar un test, responder una pregunta y recargar.
2. Pulsar «Comenzar simulacro» y comprobar el modal.
3. Cancelar y verificar banner y `localStorage.scs_active`.
4. Repetir y confirmar; comprobar que el nuevo test empieza en la pregunta 1.
5. Pulsar «Continuar examen» y comprobar que no hay modal.

## 7. Riesgos y notas

- Depende del spec 006 para que el modal sea accesible.
- El modal actual es de confirmación simple: reutilizarlo evita introducir otro componente.
