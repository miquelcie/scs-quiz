# Constitución del proyecto — `scs-quiz`

> **Metodología:** Spec-Driven Development (SDD).
> **Carácter:** normativo. Define los principios no negociables que toda especificación, plan, tarea e implementación deben respetar.
> **Versión:** 1.1.0 · **Ratificada:** 2026-11-02 · **Última enmienda:** 2026-11-02
> **Ámbito:** todo el repositorio `scs-quiz`.

---

## 1. Propósito y autoridad

Este documento es la fuente de verdad para las decisiones de diseño y desarrollo del proyecto. Cualquier especificación (`spec`), plan técnico (`plan`), desglose de tareas (`tasks`) o cambio de código debe ser coherente con él.

Jerarquía de autoridad, de mayor a menor:

1. `constitution.md` (este documento) — principios no negociables.
2. La especificación funcional vigente — qué debe hacer el sistema.
3. El plan técnico y las tareas — cómo se implementa.
4. `AGENTS.md` — convenciones operativas para agentes.
5. `MEMORY.md` — estado y conocimiento acumulado.

Si una propuesta entra en conflicto con esta constitución, debe modificarse la propuesta o tramitarse una enmienda (véase §7); nunca ignorarse de forma implícita.

## 2. Principios fundamentales

### I. Privacidad y funcionamiento 100 % local

La aplicación debe funcionar por completo en el navegador del usuario, sin backend, sin cuentas y sin enviar datos personales a terceros.

- Sin llamadas de red en tiempo de ejecución.
- Sin telemetría, analítica ni cookies de seguimiento.
- Todos los datos del usuario permanecen en `localStorage`.
- El funcionamiento offline es un requisito, no una mejora opcional.

### II. Simplicidad y cero dependencias

El proyecto es HTML5, CSS3 y JavaScript (ES6+) *vanilla*.

- No se añaden frameworks, librerías, preprocesadores ni CDNs sin una enmienda aprobada.
- No hay paso de compilación ni gestor de paquetes.
- Se prefiere código explícito y legible frente a abstracciones prematuras.
- Toda dependencia nueva debe justificar el coste en mantenimiento, seguridad y offline.

### III. Integridad del contenido oficial

El banco de preguntas es el activo principal del proyecto y debe ser fiable y trazable.

- Cada pregunta tiene un `id` único y estable (`SCS-RAD-NNN`).
- `correctOption` debe existir siempre entre los `id` de `options`.
- El contenido va en UTF-8 y conserva tildes, `ñ` y signos de apertura (`¿`, `¡`).
- Toda modificación del banco debe poder rastrearse a su documento y página de origen.
- No se inventan preguntas, respuestas ni explicaciones sin respaldo documental.
- Las opciones de cada pregunta se muestran en el orden exacto definido en el banco y no se reordenan en tiempo de ejecución.

### IV. Seguridad por defecto

- Todo contenido dinámico insertado con `innerHTML` pasa por `escapeHTML()`.
- Prohibido `eval`, `new Function`, `innerHTML` con datos sin escapar y scripts de origen remoto.
- No se introducen secretos, credenciales ni claves en el repositorio.
- La superficie de ataque debe mantenerse mínima: sin red, sin dependencias, sin ejecución dinámica.

### V. Datos del usuario bajo contrato explícito

- El acceso a `localStorage` se encapsula en `js/storage.js`.
- Las claves `scs_alias`, `scs_history` y `scs_active` son un contrato de datos.
- Cualquier cambio de esquema persistido requiere migración o compatibilidad hacia atrás.
- Los intentos del historial se guardan como *snapshots* autocontenidos para no corromperse con cambios futuros del banco.
- La pérdida o corrupción de datos locales debe gestionarse de forma segura y sin romper la aplicación.

### VI. Interfaz en español, accesible y responsiva

- Todos los textos de interfaz, mensajes, comentarios y documentación están en español.
- La interfaz debe ser usable en móvil y escritorio.
- Los controles interactivos deben ser accesibles por teclado y contar con etiquetas/roles adecuados.
- Se usa el tema institucional definido con variables CSS en `:root`; no se introducen colores o estilos ad hoc.
- Se prefieren componentes y patrones existentes (botones, tarjetas, modal propio) antes que crear variantes nuevas.

### VII. Especificación antes que implementación

- Ningún cambio no trivial se implementa sin una especificación previa que describa el comportamiento esperado y los criterios de aceptación.
- Las especificaciones describen **qué** y **por qué**, no **cómo**.
- Los planes técnicos y tareas derivan de la especificación, no al revés.
- Si la implementación revela que la especificación era incorrecta, se actualiza la especificación primero.

### VIII. Verificabilidad y reversibilidad

- Todo cambio debe poder verificarse manualmente mediante el flujo completo de la aplicación.
- Los cambios deben ser pequeños, revisables y reversibles.
- No se mezclan refactorizaciones amplias con cambios funcionales en la misma entrega.
- La verificación mínima incluye: carga sin errores en consola, flujo inicio → preguntas → finalización → resultados → historial y recuperación tras recarga.

## 3. Restricciones técnicas

- **Plataforma:** navegadores modernos con soporte de módulos ES y `localStorage`.
- **Ejecución:** servir por HTTP (por ejemplo `python -m http.server 8000`); `file://` no es un entorno soportado por los módulos ES.
- **Estructura:** una sola página (`index.html`), estilos en `css/styles.css`, lógica modular en `js/`.
- **Persistencia:** únicamente `localStorage`, a través de `Storage`.
- **Codificación:** UTF-8.
- **Sin build:** el código servido es el código fuente.

## 4. Flujo de trabajo SDD

Cada cambio sigue este ciclo:

1. **Especificar** — describir el problema, el comportamiento esperado, los criterios de aceptación y los casos límite.
2. **Planificar** — decidir el enfoque técnico, los archivos afectados y los riesgos, verificando conformidad con esta constitución.
3. **Desglosar tareas** — dividir el trabajo en pasos pequeños y verificables.
4. **Implementar** — escribir el cambio mínimo que satisface la especificación.
5. **Verificar** — ejecutar el checklist de calidad y confirmar los criterios de aceptación.
6. **Registrar** — actualizar `MEMORY.md` (estado, decisiones, deuda técnica y bitácora).

Una tarea que no pueda justificarse contra una especificación y esta constitución no debe realizarse.

## 5. Puertas de calidad

Antes de dar un cambio por terminado:

- [ ] La aplicación carga sin errores en consola servida por HTTP.
- [ ] Se respetan los criterios de aceptación de la especificación.
- [ ] El flujo completo de examen funciona (inicio, respuesta, navegación, finalización, resultados, historial, recuperación).
- [ ] El contenido dinámico está escapado.
- [ ] No se han añadido dependencias, red ni ejecución dinámica.
- [ ] El banco de preguntas sigue siendo válido (IDs únicos, `correctOption` existente, UTF-8).
- [ ] La interfaz está en español y usa el tema y componentes existentes.
- [ ] `MEMORY.md` está actualizado.

## 6. No objetivos

Quedan fuera del alcance salvo enmienda expresa:

- Backend, autenticación o sincronización entre dispositivos.
- Aplicación móvil nativa.
- Panel de administración o edición del banco en tiempo de ejecución.
- Analítica, publicidad o monetización.
- Internacionalización a otros idiomas.

## 7. Gobernanza

### Supremacía

Esta constitución prevalece sobre cualquier otra práctica, convención o preferencia no documentada.

### Enmiendas

Toda modificación requiere:

1. Justificación escrita del cambio y del principio afectado.
2. Revisión de impacto en especificaciones, planes, código y datos persistidos.
3. Actualización de la versión y de la fecha de enmienda.
4. Entrada en la bitácora de `MEMORY.md`.

### Versionado

Se sigue Versionado Semántico:

- **MAJOR:** eliminación o redefinición incompatible de un principio.
- **MINOR:** nuevo principio o sección, o ampliación material de uno existente.
- **PATCH:** aclaraciones, redacción o correcciones que no cambian el significado.

### Cumplimiento

- Toda propuesta debe incluir una comprobación explícita de conformidad con esta constitución.
- Las excepciones deben ser explícitas, justificadas, acotadas en el tiempo y registradas en `MEMORY.md`.
- La complejidad solo se añade cuando está justificada por un requisito verificable.
