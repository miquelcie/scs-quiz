# Simulador de Test de Oposiciones - Servicio Canario de Salud (SCS)

[![Tecnologías](https://img.shields.io/badge/Tecnologías-HTML5%20%7C%20CSS3%20%7C%20JS%20(ES6%2B)-green.svg)]()
[![Desarrollado con IA](https://img.shields.io/badge/Desarrollado%20con-Inteligencia%20Artificial-purple.svg)]()

Aplicación web cliente (SPA) para la preparación y práctica de cuestionarios tipo test orientados a los **Procesos Selectivos Extraordinarios de Estabilización de Empleo Temporal del Servicio Canario de Salud (SCS)** (*Resolución de 23 de diciembre de 2022, BOC nº 255*), en la categoría **Técnico/a Especialista en Radiodiagnóstico y Legislación Autonómica**.

El banco incluye **300 preguntas** y la aplicación funciona **íntegramente en el navegador**, sin backend, sin base de datos y sin llamadas de red.

---

## 🤖 Declaración de Desarrollo con IA

Este proyecto ha sido **concebido, diseñado y codificado íntegramente mediante Inteligencia Artificial** a partir de las especificaciones y requisitos proporcionados por el usuario. La extracción, estructuración y validación del banco de preguntas se realizó procesando los documentos oficiales publicados por la Dirección General de Recursos Humanos del Servicio Canario de Salud.

---

## 🚀 Características principales

- **Banco de 300 preguntas oficiales:** cuestionarios extraídos de los repertorios definitivos del SCS, con 4–5 opciones por pregunta y explicación cuando está disponible.
- **Selector de preguntas personalizable:** permite realizar simulacros de **25, 50, 100 preguntas** o la **totalidad del banco**.
- **Aleatorización del orden de preguntas:** algoritmo de permutación **Fisher-Yates** aplicado únicamente al orden de las preguntas. Las opciones de cada pregunta conservan el orden exacto definido en el banco oficial.
- **Cronómetro de alta precisión:** basado en marcas de tiempo (`Date.now()`), resistente a la suspensión o minimizado de pestañas.
- **Recuperación del examen en curso:** el avance se guarda automáticamente en `localStorage`; tras una recarga se puede continuar el cuestionario o descartarlo. Si se intenta empezar otro test con uno activo, se muestra una confirmación antes de borrarlo.
- **Historial completo:** conserva los intentos anteriores con snapshots de preguntas y respuestas, permite revisarlos, muestra el último resultado en la portada y permite borrar el historial con confirmación.
- **Alias opcional validado:** admite letras Unicode (incluidas tildes y `ñ`), números, guion y guion bajo, con un máximo de 30 caracteres y sin espacios. El valor se sanea en vivo; si se deja vacío se muestra «Aspirante».
- **Accesibilidad:** navegación por teclado, foco gestionado entre pantallas, opciones seleccionables con `Enter`/`Espacio` y modal con *focus trap*, cierre con `Escape`, fondo inerte y etiquetas ARIA.
- **Diseño responsive:** interfaz adaptable, verificada a 375 px.
- **Privacidad y aislamiento 100 % client-side:** funciona completamente fuera de línea (*offline*). No requiere servidor backend, bases de datos remotas ni envío de datos personales a Internet.

---

## 🛠️ Tecnologías utilizadas

- **HTML5:** estructura semántica accesible.
- **CSS3:** variables nativas, Flexbox, CSS Grid y diseño responsive sin frameworks externos ni fuentes remotas.
- **JavaScript (ES6+):** módulos ES nativos y Web Storage API, sin frameworks ni bundler.
- **Node.js (solo para tests):** runner nativo `node:test`; la aplicación no necesita Node para ejecutarse.

El proyecto no tiene dependencias externas ni proceso de compilación. `package.json` existe únicamente para declarar `"type": "module"` y el script `npm test`.

---

## 📁 Estructura del proyecto

```text
index.html              # Única página con las 4 pantallas y el modal global
css/styles.css          # Todo el estilo (variables CSS, sin frameworks)
js/app.js               # Estado, cronómetro, render y eventos
js/engine.js            # Lógica pura del examen (testeable con node --test)
js/questions.js         # Banco de 300 preguntas (QUESTION_BANK)
js/storage.js           # Wrapper de localStorage
tests/cu-01/ … cu-07/   # Tests de los casos de uso esenciales
tests/helpers/          # Fixtures y localStorage en memoria
specs/NNN-*/            # Especificaciones SDD de cada cambio
docs/constitution.md    # Principios normativos del proyecto
images/favicon.ico
AGENTS.md               # Guía operativa para agentes
MEMORY.md               # Estado, decisiones y conocimiento acumulado
package.json            # Solo ESM + script de test; sin dependencias
```

---

## 💻 Instrucciones de ejecución local

No se requiere compilación. La aplicación debe servirse por **HTTP**: abrir `index.html` con doble clic (`file://`) no funciona porque los módulos ES quedan bloqueados por CORS en la mayoría de navegadores.

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/miquelcie/scs-quiz.git
   cd scs-quiz
   ```

2. **Servir la carpeta por HTTP** con cualquiera de estas opciones:

   ```bash
   # Python 3
   python -m http.server 8000

   # o, si dispones de Node.js
   npx serve .
   ```

3. **Abrir la aplicación:**

   ```text
   http://localhost:8000
   ```

No hay backend ni base de datos. Todo el estado del usuario se guarda en el navegador.

---

## 🧪 Tests

```bash
npm test        # equivale a node --test
node --test     # sin pasar por npm
```

- Se usa el runner nativo de Node (`node:test` + `node:assert/strict`); no se instala ninguna dependencia.
- Hay **107 tests** que cubren los casos de uso CU-01 a CU-07, incluidos la validación del alias y el ciclo de foco del modal.
- La lógica testeable vive en `js/engine.js`, sin DOM ni almacenamiento.
- Los tests no sustituyen la verificación manual con Chrome DevTools: conviene probar el flujo completo, la consola y la vista móvil.

---

## 🔒 Privacidad y almacenamiento

Toda la información del usuario permanece almacenada **únicamente en el navegador local** a través de la Web Storage API (`localStorage`):

| Clave         | Contenido                                   |
| ------------- | ------------------------------------------- |
| `scs_alias`   | Alias del aspirante                         |
| `scs_history` | Intentos realizados (el más reciente primero) |
| `scs_active`  | Examen en curso para recuperación           |

Los intentos guardan snapshots completos de preguntas y respuestas, por lo que cambios futuros en el banco no alteran los resultados antiguos, aunque aumentan el espacio ocupado.

> **Nota:** si borras los datos de navegación o la caché del sitio, se restablecerán el historial y el examen en curso. Los datos no se sincronizan entre dispositivos ni navegadores.

---

## 📚 Documentación de desarrollo

- `AGENTS.md`: convenciones operativas, estructura y comandos.
- `MEMORY.md`: estado del proyecto, decisiones de arquitectura, aprendizajes y deuda técnica.
- `docs/constitution.md`: principios normativos del proyecto (SDD).
- `specs/NNN-*/`: especificaciones, planes y tareas de cada cambio.

---

## 📄 Licencia y uso

Este repositorio no incluye actualmente un archivo `LICENSE`. Las preguntas y respuestas contenidas son propiedad del Servicio Canario de Salud y se utilizan exclusivamente con fines educativos y de preparación personal.
