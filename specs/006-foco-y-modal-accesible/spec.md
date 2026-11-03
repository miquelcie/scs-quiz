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

- **R1** — El modal cerrado debe estar oculto con el atributo `hidden` (o `display: none`), no solo con `opacity`. Sus botones no deben ser enfocables ni aparecer en el árbol de accesibilidad. Como `.modal-overlay` define `display: flex`, se añadirá una regla `.modal-overlay[hidden] { display: none; }` que venza esa especificidad; el atributo `hidden` por sí solo no basta.
- **R2** — No debe usarse `aria-hidden` dinámico sobre un elemento que pueda contener el foco.

### Modal abierto

- **R3** — Debe tener `aria-labelledby="modal-title"` y `aria-describedby="modal-msg"`.
- **R4** — Al abrirse, el foco se mueve siempre a «Aceptar», que es la acción principal del diálogo. No se enfoca «Cancelar» ni el contenedor.
- **R5** — `Tab` y `Shift+Tab` deben ciclar únicamente entre los controles del modal.
- **R6** — `Escape` cierra el modal desde cualquier punto mientras esté abierto.
- **R7** — Mientras el modal está abierto, `header`, `main` y `footer` deben quedar `inert` para que el fondo no reciba foco. No se usará `aria-hidden` como fallback (R2): si el navegador no soporta `inert`, el *focus trap* de R5 mantiene el teclado dentro del diálogo.
- **R8** — El fondo no debe hacer scroll mientras el modal está abierto.

### Cierre y restauración del foco

- **R9** — Al cerrar con «Cancelar» o `Escape`, el foco vuelve al elemento que abrió el modal si sigue en el DOM y es visible.
- **R10** — Al confirmar una acción, el foco debe quedar siempre en un elemento visible de la pantalla resultante, nunca dentro del modal oculto. Destinos concretos:

  | Acción | Pantalla | Destino de foco |
  | --- | --- | --- |
  | Finalizar test | resultados | `#screen-results` |
  | Descartar examen | portada | `#btn-start-quiz` |
  | Borrar historial | portada | `#btn-clear-history` |
  | Eliminar intento | historial | `#screen-history` (o su encabezado si queda vacío) |
  | Confirmar descarte y empezar (003) | quiz | `#screen-quiz` |

- **R11** — No debe aparecer ningún warning de `aria-hidden` en consola.

### Cambio de pantalla

- **R12** — `switchScreen()` debe mover el foco al contenedor de la pantalla activa (con `tabindex="-1"`) o a su encabezado, para que el teclado continúe desde ahí. El contenido debe renderizarse **antes** de llamar a `switchScreen()`, de modo que el foco caiga sobre datos actualizados y el lector no anuncie contenido obsoleto.
- **R13** — El foco se mueve sin provocar scroll adicional (`preventScroll` cuando esté disponible).

## 5. Criterios de aceptación

- [ ] Con el modal cerrado, tabular desde «Borrar historial» no entra en «Cancelar»/«Aceptar»; el modal cerrado no aparece en el árbol de accesibilidad.
- [ ] Abrir el modal mueve el foco a «Aceptar» y anuncia título y mensaje (`aria-labelledby`/`aria-describedby`).
- [ ] Con el foco inicial en «Aceptar», `Tab` recorre Aceptar → Cancelar → Aceptar; `Shift+Tab`, al revés.
- [ ] `Escape` cierra desde cualquier punto y devuelve el foco al botón que abrió el modal.
- [ ] Con el modal abierto, el fondo (`header`, `main`, `footer`) está `inert` y no recibe foco.
- [ ] Confirmar «Finalizar test» deja el foco en `#screen-results`.
- [ ] Confirmar «Descartar examen» deja el foco en `#btn-start-quiz`; «Borrar historial», en `#btn-clear-history`.
- [ ] Confirmar «Eliminar intento» deja el foco en `#screen-history` o en su encabezado si queda vacío.
- [ ] La consola no muestra `Blocked aria-hidden` ni errores.
- [ ] Al iniciar un test, el foco está en la pantalla del cuestionario y el contenido ya está renderizado.
- [ ] Al terminar, el foco está en la pantalla de resultados y el contenido ya está renderizado.
- [ ] El foco programático no provoca scroll adicional y se comprueba a 375 px.

## 6. Verificación

### Automática

No hay tests DOM en el proyecto. Se mantiene la verificación manual; si en el futuro se añade un arnés DOM sin dependencias, estos criterios pasan a tests.

### Manual (Chrome DevTools)

1. Portada: tabular hasta «Borrar historial», comprobar que el siguiente `Tab` no entra en el modal cerrado.
2. Abrir el modal: comprobar foco inicial en «Aceptar» y nombre/descripción en el árbol de accesibilidad.
3. Recorrer con `Tab`/`Shift+Tab` y comprobar que el fondo está `inert` y no recibe foco.
4. Cerrar con `Escape` y comprobar el foco restaurado.
5. Finalizar un test y confirmar; comprobar foco en `#screen-results` y consola limpia.
6. Eliminar un intento, borrar historial y descartar un examen: comprobar los destinos de foco de R10.
7. Iniciar un test y comprobar el foco en el cuestionario ya renderizado.
8. Repetir a 375 px y comprobar que no hay scroll adicional.

## 7. Riesgos y notas

- `inert` está soportado en navegadores actuales. Si no lo estuviera, el *focus trap* de R5 mantiene el teclado dentro; no se aplicará `aria-hidden` como fallback (R2).
- El modal está fuera de `main`; aplicar `inert` a `header`, `main` y `footer` evita inertizar el propio diálogo.
- Renderizar antes de `switchScreen()` es obligatorio (R12): si se enfoca antes de pintar, el lector anuncia contenido obsoleto o vacío.
- Este spec es dependencia de 003 (modal de descarte) y de 002 (foco tras resultados).
