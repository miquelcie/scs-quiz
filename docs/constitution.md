# Constitución de scs-quiz (v1.0.0)

Norma suprema del proyecto: prevalece sobre `AGENTS.md` y las specs. Solo se enmienda con aprobación explícita.

1. **Stack mínimo**: solo HTML5, CSS3 y JavaScript ES6+ nativo, sin frameworks, bundler, dependencias ni red; cualquier excepción exige enmienda.
2. **Spec y código acoplados**: ningún cambio no trivial sin spec aprobada con criterios verificables; el código la implementa y toda desviación se registra y actualiza la spec.
3. **Lógica e interfaz separadas**: `index.html` solo estructura, `styles.css` solo presentación y `app.js` estado/render; sin lógica de negocio en HTML/CSS ni `localStorage` fuera de `storage.js`.
4. **Verificación sin dependencias**: no se instalan runners ni frameworks de test; cada cambio se prueba manualmente con Chrome DevTools (flujo completo, consola y vista móvil a 375 px) y deja evidencia.
5. **Datos del usuario protegidos**: alias, historial y examen en curso solo en `localStorage`; cero red o telemetría, todo dato dinámico insertado como HTML escapado y ningún borrado sin confirmación.
6. **Idioma coherente**: interfaz, comentarios, specs y documentación en español; identificadores y APIs en inglés; UTF-8 en todo el proyecto.
