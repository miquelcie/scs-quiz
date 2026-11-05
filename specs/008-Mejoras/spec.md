# Spec 008 — Mejoras rápidas de robustez, accesibilidad y UX

## 1. Problema

Tras la implementación de los specs 001–007, el proyecto es funcional y los tests pasan (107/107), pero el informe de mejoras (`docs/informe-mejoras.md`) identifica un conjunto de mejoras pequeñas y de bajo riesgo que aumentan la robustez, la accesibilidad y la experiencia de usuario sin alterar la arquitectura ni las decisiones vigentes. Concretamente:

- `buildQuiz` no valida el parámetro `count` y puede devolver un cuestionario vacío con entrada inválida.
- El radiogrupo de opciones solo se maneja con `Enter`/`Espacio`, sin navegación por flechas, que es el patrón esperado para `role="radiogroup"`.
- El enunciado de la pregunta no se anuncia a los lectores de pantalla al cambiar de pregunta.
- La animación de cambio de pantalla no respeta `prefers-reduced-motion`.
- Al seleccionar una opción con ratón se pierde el foco porque `renderQuestion()` se invoca sin índice de foco.
- No hay aviso al cerrar/recargar la pestaña con un examen en curso.
- El campo de alias no desactiva la autocorrección en móviles.
- `finishQuiz` construye manualmente el plural de «pregunta sin responder» en lugar de reusar `pluralize`.
- El manejador de clic del historial lee `e.target.dataset.id`, que falla si el clic cae en un hijo del botón.
- `scoreQuiz` divide por cero si recibe un banco vacío.
- No hay Content-Security-Policy, pese a que la app no usa recursos remotos.

## 2. Objetivos

1. Endurecer la validación de entradas en `buildQuiz` y `scoreQuiz`.
2. Mejorar la accesibilidad del cuestionario (teclado, anuncio, movimiento reducido, foco).
3. Evitar la pérdida accidental de un examen en curso al cerrar la pestaña.
4. Mejorar la experiencia en móviles (alias) y la corrección (pluralización).
5. Robustecer el manejador de clic del historial.
6. Añadir una CSP coherente con el modo offline.

## 3. Alcance

**En alcance:**
- Los 11 puntos enumerados en §1: 1.3, 2.1, 2.2, 2.3, 2.5, 3.1, 3.6, 4.2, 4.3, 4.4, 5.1.
- Cambios mínimos en `engine.js`, `app.js`, `index.html` y `css/styles.css`.
- Tests unitarios nuevos para `buildQuiz` con `count` inválido y `scoreQuiz` con banco vacío.

**Fuera de alcance:**
- Control de cuota de `localStorage` (1.1), compacidad de snapshots (1.2), división de `app.js` (6.1), PWA (8.1) y tests de integración DOM (7.1), que se dejan para specs posteriores.
- Cambios en el banco de preguntas o en las claves de `localStorage`.

## 4. Requisitos funcionales

- **RF-01** `buildQuiz(bank, count)` devuelve un cuestionario no vacío cuando `count` es un valor no reconocido o no convertible; si `count` no es `'max'` ni un entero positivo, se interpreta como «todo el banco».
- **RF-02** En el radiogrupo de opciones, las teclas `ArrowDown`/`ArrowRight` avanzan a la siguiente opción y `ArrowUp`/`ArrowLeft` retroceden, con envolvimiento circular; `Home` y `End` saltan a la primera y última opción respectivamente.
- **RF-03** El contenedor de pregunta (`#question-statement` o su contenedor) expone `aria-live="polite"` para que el lector anuncie el nuevo enunciado.
- **RF-04** Con `prefers-reduced-motion: reduce`, la animación `screen-in` y cualquier transición no esencial se desactivan.
- **RF-05** Al seleccionar una opción con ratón, el foco se conserva sobre la opción seleccionada tras el re-renderizado.
- **RF-06** Si hay un examen en curso (`isQuizInProgress`), el navegador muestra el diálogo nativo de confirmación al intentar cerrar o recargar la pestaña.
- **RF-07** El campo `#input-alias` incluye `autocorrect="off"` (además de los atributos ya presentes).
- **RF-08** `finishQuiz` usa `pluralize` para el texto de preguntas pendientes.
- **RF-09** El manejador de clic de «Ver»/«Eliminar» en el historial obtiene el identificador desde el botón contenedor (`closest`/`currentTarget`), no desde `event.target`.
- **RF-10** `scoreQuiz` con `questions` vacío o no array devuelve `{ hits: 0, errors: 0, unanswered: 0, scorePct: 0 }` sin lanzar.
- **RF-11** Se añade una etiqueta `<meta http-equiv="Content-Security-Policy">` compatible con los recursos locales (sin CDN ni scripts remotos).

## 5. Requisitos no funcionales

- **RNF-01** Sin dependencias nuevas ni build step (principio 1 de la constitución).
- **RNF-02** Todo texto de UI y comentarios en español; identificadores en inglés.
- **RNF-03** `npm test` sigue en verde y se añaden tests para RF-01 y RF-10.
- **RNF-04** Verificación manual con Chrome DevTools: flujo completo, consola limpia y vista a 375 px.

## 6. Criterios de aceptación

- **CA-01** `buildQuiz(bank, 'foo')` devuelve `bank.length` preguntas (o el banco completo) sin lanzar y sin devolver `[]`.
- **CA-02** Con teclado, `ArrowDown`/`ArrowRight`/`ArrowUp`/`ArrowLeft`/`Home`/`End` navegan entre opciones y la opción enfocada se marca como seleccionada al pulsar `Enter`/`Espacio`.
- **CA-03** Al cambiar de pregunta, el lector anuncia el nuevo enunciado.
- **CA-04** Con `prefers-reduced-motion: reduce`, no se observa animación al cambiar de pantalla.
- **CA-05** Tras hacer clic en una opción, el foco permanece sobre ella.
- **CA-06** Con un examen en curso, al intentar cerrar la pestaña aparece el diálogo de confirmación del navegador.
- **CA-07** En móvil, el campo de alias no ofrece autocorrección.
- **CA-08** El texto de preguntas pendientes pluraliza correctamente («1 pregunta sin responder» / «N preguntas sin responder»).
- **CA-09** Al hacer clic en el borde/padding del botón del historial, la acción se ejecuta igualmente.
- **CA-10** `scoreQuiz([], {})` devuelve `{ hits: 0, errors: 0, unanswered: 0, scorePct: 0 }`.
- **CA-11** La CSP no bloquea la carga de la app ni de sus recursos locales; la consola no muestra violaciones.

## 7. Restricciones y dependencias

- Constitución v1.0.0 (principios 1–6).
- `AGENTS.md` y `MEMORY.md` como referencia de convenciones.
- Sin dependencias nuevas; todo con APIs nativas.
- Compatibilidad con los tests existentes (107) y con los snapshots del historial (inmutabilidad).
- `pluralize` ya existe en `engine.js` y se exporta; reusarlo, no duplicarlo.
