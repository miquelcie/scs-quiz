# 002 — Refrescar «Último resultado» al configurar otro test

- **Estado:** propuesta
- **Fecha:** 2026-11-03
- **Prioridad:** media
- **Caso de uso:** CU-04 (finalizar) / CU-05 (historial)
- **Componentes:** `js/app.js`

## 1. Problema

El botón «Configurar otro test» de la pantalla de resultados (`js/app.js:385`) solo ejecuta `switchScreen('home')`. No llama a `renderLastAttempt()`, por lo que la tarjeta «Último resultado» sigue mostrando el contenido anterior.

Reproducción: terminar el primer simulacro, pulsar «Configurar otro test» y comprobar que la portada muestra «Todavía no has completado ningún simulacro» aunque el historial ya tenga un intento. «Volver al inicio» sí lo actualiza porque sí llama a `renderLastAttempt()`.

## 2. Objetivo

Que las tres salidas de resultados/historial dejen la portada con el último intento real.

## 3. Fuera de alcance

- Cambiar el diseño o el contenido de la tarjeta.
- Modificar el orden del historial.

## 4. Requisitos

- **R1** — `btn-restart-from-res` debe cambiar a la pantalla de inicio y ejecutar `renderLastAttempt()`.
- **R2** — La tarjeta debe mostrar la nota, los aciertos, la fecha y el tiempo del **último intento del historial** (`history[0]`), también cuando se llega desde la revisión de un intento antiguo. No debe mostrar el intento revisado si no es el último.
- **R3** — No debe duplicar ni modificar el historial.
- **R4** — Si no hay historial, debe mostrarse el estado vacío actual.
- **R5** — «Volver al inicio» (resultados) y «Volver» (historial) deben usar la misma ruta que «Configurar otro test»: renderizar la tarjeta antes de cambiar de pantalla, para que las tres salidas coincidan.

## 5. Criterios de aceptación

- [ ] Terminar un simulacro y pulsar «Configurar otro test»: la portada muestra la nota del intento recién terminado.
- [ ] El número de intentos del historial no cambia tras pulsar el botón.
- [ ] «Volver al inicio» y «Volver» del historial muestran el mismo resultado que «Configurar otro test».
- [ ] Tras revisar un intento antiguo desde el historial y volver, la tarjeta muestra el último intento (`history[0]`), no el revisado.
- [ ] Sin historial, las tres rutas muestran el estado vacío.
- [ ] La tarjeta se pinta antes de cambiar de pantalla, de modo que el foco (spec 006) cae sobre contenido actualizado.
- [ ] La consola no muestra errores.

## 6. Verificación

### Automática

No hay test unitario para este flujo porque depende del DOM. Se puede cubrir de forma indirecta si en el futuro se extrae un helper `goHomeFromResults()`.

### Manual (Chrome DevTools)

1. Borrar historial y terminar un simulacro.
2. Comprobar la tarjeta en resultados.
3. Pulsar «Configurar otro test»: la portada debe mostrar la nota del intento recién terminado.
4. Verificar que el historial sigue teniendo un solo intento.
5. Repetir con «Volver al inicio» y con «Volver» desde el historial.
6. Con dos intentos, abrir el antiguo desde el historial y volver: debe mostrarse el último (`history[0]`), no el revisado.
7. Sin historial, las tres rutas deben mostrar el estado vacío.
8. Comprobar consola limpia y vista a 375 px.

## 7. Riesgos y notas

- Conviene unificar las tres rutas en una sola función para que no vuelvan a divergir.
