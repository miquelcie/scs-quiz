# 006 — Gestión de foco y modal accesible

- **Estado:** propuesta
- **Fecha:** 2026-11-03
- **Prioridad:** media (accesibilidad)
- **Caso de uso:** transversal (CU-03, CU-04, CU-05)
- **Componentes:** `js/app.js`, `index.html`, `css/styles.css`

## 1. Problema

El modal de confirmación se oculta solo con `opacity: 0` y `pointer-events: none` (`css/styles.css:1066-1083`). Sus botones siguen en el orden de tabulación y en el árbol de accesibilidad aunque el diálogo esté cerrado.

Además, al confirmar, `cleanup(false)` marca `aria-hidden="true"` sin sacar el foco de `#modal-confirm`. Chrome emite:

```
Blocked aria-hidden on an element because its descendant retained focus.
Element with focus: <button#modal-confirm>
Ancestor with aria-hidden: <div#custom-modal>
```

Otros problemas del mismo componente:

- No hay *focus trap*: `Tab` puede salir del diálogo al fondo.
- `Escape` solo funciona si el foco está dentro del modal.
- El diálogo no tiene nombre ni descripción accesibles (`aria-labelledby`/`aria-describedby`).
- El fondo no queda inerte mientras el modal está abierto, pese a `aria-modal="true"`.
- `switchScreen()` no mueve el foco: al iniciar o finalizar un test, el foco se queda en un control que acaba de ocultarse.

## 2. Objetivo

Que el modal y los cambios de pantalla sean operables solo con teclado y anunciados correctamente por un lector de pantalla, sin warnings de `aria-hidden`.

## 3. Fuera de alcance

- Rediseñar visualmente el modal.
- Añadir dependencias de accesibilidad.
- Cambiar los textos de confirmación.

## 4. Requisitos

### Modal cerrado

- **R1** — El modal cerrado debe estar oculto con el atributo `hidden` (o `display: none`), no solo con `opacity`. Sus botones no deben ser enfocables ni aparecer en el árbol de accesibilidad.
- **R2** — No debe usarse `aria-hidden` dinámico sobre un elemento que pueda contener el foco.

### Modal abierto

- **R3** — Debe tener `aria-labelledby="modal-title"` y `aria-describedby="modal-msg"`.
- **R4** — Al abrirse, el foco se mueve a «Aceptar» (o al primer control relevante).
- **R5** — `Tab` y `Shift+Tab` deben ciclar únicamente entre los controles del modal.
- **R6** — `Escape` cierra el modal desde cualquier punto mientras esté abierto.
- **R7** — Mientras el modal está abierto, `header`, `main` y `footer` deben quedar `inert` (o equivalente) para que el fondo no reciba foco.
- **R8** — El fondo no debe hacer scroll mientras el modal está abierto.

### Cierre y restauración del foco

- **R9** — Al cerrar con «Cancelar» o `Escape`, el foco vuelve al elemento que abrió el modal si sigue en el DOM y es visible.
- **R10** — Al confirmar una acción que cambia de pantalla (finalizar test, descartar, borrar historial), el foco debe quedar en un elemento visible de la pantalla destino, nunca dentro del modal oculto.
- **R11** — No debe aparecer ningún warning de `aria-hidden` en consola.

### Cambio de pantalla

- **R12** — `switchScreen()` debe mover el foco al contenedor de la pantalla activa (con `tabindex="-1"`) o a su encabezado, para que el teclado continúe desde ahí.
- **R13** — El foco se mueve sin provocar scroll adicional (`preventScroll` cuando esté disponible).

## 5. Criterios de aceptación

- [ ] Con el modal cerrado, tabular desde «Borrar historial» no entra en «Cancelar»/«Aceptar».
- [ ] Abrir el modal mueve el foco a «Aceptar» y anuncia título y mensaje.
- [ ] `Tab` recorre Cancelar → Aceptar → Cancelar; `Shift+Tab`, al revés.
- [ ] `Escape` cierra y devuelve el foco al botón que abrió el modal.
- [ ] Confirmar «Finalizar test» deja el foco en un elemento visible de resultados.
- [ ] Confirmar «Eliminar intento» deja el foco en el historial o en un control visible.
- [ ] La consola no muestra `Blocked aria-hidden` ni errores.
- [ ] Al iniciar un test, el foco está en la pantalla del cuestionario.
- [ ] Al terminar, el foco está en la pantalla de resultados.

## 6. Verificación

### Automática

No hay tests DOM en el proyecto. Se mantiene la verificación manual; si en el futuro se añade un arnés DOM sin dependencias, estos criterios pasan a tests.

### Manual (Chrome DevTools)

1. Portada: tabular hasta «Borrar historial», comprobar que el siguiente `Tab` no entra en el modal cerrado.
2. Abrir el modal y recorrer con `Tab`/`Shift+Tab`.
3. Cerrar con `Escape` y comprobar el foco restaurado.
4. Finalizar un test y confirmar; comprobar foco visible y consola limpia.
5. Eliminar un intento y repetir.
6. Iniciar un test y comprobar el foco inicial.

## 7. Riesgos y notas

- `inert` está soportado en navegadores actuales; si se necesita un fallback, aplicar `aria-hidden` solo al fondo y nunca al elemento con foco.
- El modal está fuera de `main`; aplicar `inert` a `header`, `main` y `footer` evita inertizar el propio diálogo.
- Este spec es dependencia de 003 (modal de descarte) y de 002 (foco tras resultados).
