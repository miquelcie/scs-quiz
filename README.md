# 🏥 Simulador de Test de Oposiciones - Servicio Canario de Salud (SCS)

[![Licencia](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)
[![Tecnologías](https://img.shields.io/badge/Tecnologías-HTML5%20%7C%20CSS3%20%7C%20JS%20(ES6%2B)-green.svg)]()
[![Desarrollado con IA](https://img.shields.io/badge/Desarrollado%20con-Inteligencia%20Artificial-purple.svg)]()

Aplicación web cliente (SPA) para la preparación y práctica de cuestionarios tipo test orientados a los **Procesos Selectivos Extraordinarios de Estabilización de Empleo Temporal del Servicio Canario de Salud (SCS)** (*Resolución de 23 de diciembre de 2022, BOC nº 255*).

---

## 🤖 Declaración de Desarrollo con IA

Este proyecto ha sido **concebido, diseñado y codificado íntegramente mediante Inteligencia Artificial** a partir de las especificaciones y requisitos proporcionados por el usuario. La extracción, estructuración y validación del banco de preguntas se realizó procesando los documentos oficiales publicados por la Dirección General de Recursos Humanos del Servicio Canario de Salud.

---

## 🚀 Características Principales

- **Banco de Preguntas Oficial:** Cuestionarios extraídos directamente de los repertorios definitivos del SCS (categoría *Técnico/a Especialista en Radiodiagnóstico y Legislación Autonómica*).
- **Aleatorización Eficiente:** Algoritmo de permutación **Fisher-Yates** aplicado tanto al orden de las preguntas como al de las opciones de respuesta, garantizando intentos únicos sin duplicados.
- **Selector de Preguntas Personalizable:** Permite realizar simulacros de **25, 50, 100 preguntas** o la **totalidad del banco** disponible.
- **Cronómetro de Alta Precisión:** Basado en marcas de tiempo (`Date.now()`), inmune a la suspensión o minimizado de pestañas en el navegador.
- **Persistencia Local (`localStorage`):** Guarda automáticamente el avance del cuestionario en curso (recuperación ante recargas accidentales) y conserva un historial completo de simulacros anteriores.
- **Privacidad y Aislamiento 100% Client-Side:** Funciona completamente fuera de línea (*offline*). No requiere servidor backend, bases de datos remotas ni envío de datos personales a Internet.
- **Codificación y Accesibilidad:** Desarrollado con codificación UTF-8 nativa, interfaz adaptable (*responsive*) y diseño institucional alineado con la identidad del SCS.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5:** Estructura semántica accesible.
- **CSS3:** Variables nativas, Flexbox, CSS Grid y diseño responsivo sin dependencias de frameworks externos.
- **JavaScript (ES6+):** Programación modular Vanilla JS con Web Storage API.

---

## 💻 Instrucciones de Ejecución Local

No se requiere ningún entorno de ejecución especial (como Node.js o Python) ni proceso de compilación.

1. **Clonar o descargar el repositorio:**
   ```bash
   git clone https://github.com/usuario/test-oposiciones-scs.git
   ```
2. **Ejecutar la aplicación:**
   - Abre directamente el archivo `index.html` en tu navegador web preferido (Chrome, Firefox, Edge, Safari).
   - *Opcional:* Servir mediante cualquier servidor HTTP estático (ej. la extensión *Live Server* de VS Code o `python -m http.server 8000`).

---

## 🔒 Privacidad y Almacenamiento

Toda la información del usuario (alias opcional, historial de resultados y cuestionarios en curso) permanece almacenada **únicamente en el navegador local** a través de la Web Storage API (`localStorage`). 

> **Nota:** Si borras los datos de navegación o la caché del sitio, se restablecerá el historial local. Los datos no se sincronizan entre diferentes dispositivos o navegadores.

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE). Las preguntas y respuestas contenidas son propiedad del Servicio Canario de Salud y se utilizan exclusivamente con fines educativos y de preparación personal.