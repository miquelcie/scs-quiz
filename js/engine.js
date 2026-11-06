// --- LÓGICA PURA DEL EXAMEN ---
// Sin DOM ni almacenamiento: funciones verificables con `node --test`.

const DEFAULT_ALIAS = 'Aspirante';

// --- ALIAS DE USUARIO ---

/**
 * Longitud máxima permitida para el alias de usuario.
 * @type {number}
 */
export const ALIAS_MAX_LENGTH = 30;

/**
 * Patrón permitido: letras Unicode (tildes, ñ), dígitos, guion y guion bajo.
 * @type {RegExp}
 */
export const ALIAS_PATTERN = /^[\p{L}\p{N}_-]+$/u;

/**
 * Elimina cualquier carácter no permitido y recorta a la longitud máxima.
 * Los valores que no son cadena se tratan como alias vacío.
 * @param {unknown} value Valor a normalizar.
 * @returns {string} Alias saneado.
 */
export const sanitizeAlias = value => {
    if (typeof value !== 'string') return '';
    return value.replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, ALIAS_MAX_LENGTH);
};

/**
 * Comprueba si un alias cumple el patrón y la longitud máxima.
 * La cadena vacía es válida porque el alias es opcional.
 * @param {unknown} value Valor a validar.
 * @returns {boolean} `true` si el alias es válido.
 */
export const isValidAlias = value => {
    if (value === '') return true;
    if (typeof value !== 'string') return false;
    if (value.length > ALIAS_MAX_LENGTH) return false;
    return ALIAS_PATTERN.test(value);
};


/**
 * Baraja una copia del array mediante el algoritmo de Fisher-Yates.
 * @param {unknown[]} array Lista de origen (no se muta).
 * @param {() => number} [random=Math.random] Fuente de aleatoriedad inyectable.
 * @returns {unknown[]} Nueva lista barajada.
 */
export const shuffle = (array, random = Math.random) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/**
 * Construye el cuestionario barajando solo las preguntas; las opciones conservan
 * el orden del banco.
 * @param {Array<object>} bank Banco de preguntas.
 * @param {number|string} count Número de preguntas o `'max'`.
 * @param {() => number} [random=Math.random] Fuente de aleatoriedad inyectable.
 * @returns {Array<object>} Copia superficial de las preguntas seleccionadas.
 */
export const buildQuiz = (bank, count, random = Math.random) => {
    if (!Array.isArray(bank) || bank.length === 0) return [];

    const shuffledBank = shuffle(bank, random);
    let actualCount;
    if (count === 'max') {
        actualCount = shuffledBank.length;
    } else {
        const parsed = Number.isInteger(count) ? count : parseInt(count, 10);
        actualCount = Number.isInteger(parsed) && parsed > 0
            ? Math.min(parsed, shuffledBank.length)
            : shuffledBank.length;
    }
    return shuffledBank.slice(0, actualCount).map(q => ({ ...q }));
};

/**
 * Marca, cambia o desmarca una respuesta. Muta el objeto de respuestas.
 * @param {Record<string, string>} answers Respuestas actuales.
 * @param {string} questionId Identificador de la pregunta.
 * @param {string} optionId Identificador de la opción elegida.
 * @returns {Record<string, string>} El mismo objeto de respuestas actualizado.
 */
export const toggleAnswer = (answers, questionId, optionId) => {
    if (answers[questionId] === optionId) delete answers[questionId];
    else answers[questionId] = optionId;
    return answers;
};

/**
 * Crea la instantánea que se guarda para recuperar un examen interrumpido.
 * @param {{questions: Array<object>, userAnswers: Record<string, string>, currentIndex: number, accumulatedMs: number}} quiz Estado actual del examen.
 * @returns {{questions: Array<object>, userAnswers: Record<string, string>, currentIndex: number, accumulatedMs: number}} Instantánea serializable.
 */
export const buildActiveQuizSnapshot = ({ questions, userAnswers, currentIndex, accumulatedMs }) => ({
    questions,
    userAnswers,
    currentIndex,
    accumulatedMs
});

/**
 * Calcula el índice destino con límites. Un `delta` 0 recorta un índice guardado.
 * @param {number} currentIndex Índice actual.
 * @param {number} total Número de elementos.
 * @param {number} delta Desplazamiento solicitado.
 * @returns {number} Índice válido dentro de la lista (o 0 si está vacía).
 */
export const moveIndex = (currentIndex, total, delta) => {
    const length = Number.isInteger(total) && total > 0 ? total : 0;
    if (length === 0) return 0;

    const step = Number.isInteger(delta) ? delta : 0;
    const current = Number.isInteger(currentIndex) ? currentIndex : 0;
    return Math.min(Math.max(current + step, 0), length - 1);
};

/**
 * Calcula el siguiente control del ciclo de foco. Sin controles devuelve 0; un
 * índice inválido se normaliza al primero antes de aplicar el paso.
 * @param {number} currentIndex Índice del control enfocado.
 * @param {number} total Número de controles.
 * @param {boolean} [backward=false] `true` para retroceder con `Shift+Tab`.
 * @returns {number} Índice del siguiente control.
 */
export const nextFocusIndex = (currentIndex, total, backward = false) => {
    const length = Number.isInteger(total) && total > 0 ? total : 0;
    if (length === 0) return 0;
    if (length === 1) return 0;

    const current =
        Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < length
            ? currentIndex
            : 0;
    const step = backward ? -1 : 1;
    return (current + step + length) % length;
};

/**
 * Indica si hay un cuestionario cargado y el índice actual es válido.
 * @param {unknown} questions Cuestionario a comprobar.
 * @param {unknown} currentIndex Índice actual.
 * @returns {boolean} `true` si el examen puede considerarse en curso.
 */
export const isQuizInProgress = (questions, currentIndex) =>
    Array.isArray(questions) &&
    questions.length > 0 &&
    Number.isInteger(currentIndex) &&
    currentIndex >= 0 &&
    currentIndex < questions.length;

// --- VALIDACIÓN DE DATOS PERSISTIDOS ---

/**
 * Comprueba si un valor es un objeto plano (ni null ni array).
 * @param {unknown} value Valor a comprobar.
 * @returns {boolean} `true` si es un objeto plano.
 */
export const isPlainObject = value =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Comprueba si un valor es una cadena con contenido no vacío.
 * @param {unknown} value Valor a comprobar.
 * @returns {boolean} `true` si es una cadena no vacía.
 */
export const isNonEmptyString = value =>
    typeof value === 'string' && value.trim() !== '';

const isValidOption = option =>
    isPlainObject(option) && isNonEmptyString(option.id);

/**
 * Valida la forma de una pregunta y que `correctOption` exista entre sus opciones.
 * @param {unknown} question Pregunta a validar.
 * @returns {boolean} `true` si la pregunta es representable.
 */
export const isValidQuestion = question => {
    if (!isPlainObject(question) || !isNonEmptyString(question.id)) return false;
    if (!Array.isArray(question.options) || question.options.length === 0) return false;

    const optionIds = new Set();
    for (const option of question.options) {
        if (!isValidOption(option) || optionIds.has(option.id)) return false;
        optionIds.add(option.id);
    }

    return isNonEmptyString(question.correctOption) && optionIds.has(question.correctOption);
};

/**
 * Comprueba la forma mínima de una instantánea de examen activo.
 * @param {unknown} data Datos leídos de `localStorage`.
 * @returns {boolean} `true` si la forma es representable.
 */
export const isValidActiveQuizShape = data =>
    isPlainObject(data) &&
    Array.isArray(data.questions) &&
    data.questions.length > 0 &&
    data.questions.every(isValidQuestion) &&
    isPlainObject(data.userAnswers) &&
    Number.isInteger(data.currentIndex);

/**
 * Conserva solo respuestas de preguntas propias, con texto no vacío y opción existente.
 * @param {Array<object>} questions Cuestionario de referencia.
 * @param {unknown} answers Respuestas a normalizar.
 * @returns {Record<string, string>} Respuestas válidas.
 */
export const sanitizeAnswers = (questions, answers) => {
    if (!Array.isArray(questions) || !isPlainObject(answers)) return {};

    const validOptions = new Map();
    questions.forEach(question => {
        if (isValidQuestion(question)) {
            validOptions.set(question.id, new Set(question.options.map(option => option.id)));
        }
    });

    const sanitized = {};
    Object.keys(answers).forEach(questionId => {
        const optionId = answers[questionId];
        if (!validOptions.has(questionId) || !isNonEmptyString(optionId)) return;
        if (!validOptions.get(questionId).has(optionId)) return;
        sanitized[questionId] = optionId;
    });

    return sanitized;
};

/**
 * Valida la estructura, recorta el índice y normaliza respuestas y tiempo.
 * @param {unknown} data Datos leídos de `localStorage`.
 * @returns {{questions: Array<object>, userAnswers: Record<string, string>, currentIndex: number, accumulatedMs: number}|null} Instantánea normalizada o `null` si no es válida.
 */
export const normalizeActiveQuiz = data => {
    if (!isValidActiveQuizShape(data)) return null;

    const { questions } = data;
    const currentIndex = Math.min(Math.max(data.currentIndex, 0), questions.length - 1);
    const accumulatedMs = Number.isFinite(data.accumulatedMs) && data.accumulatedMs >= 0
        ? data.accumulatedMs
        : 0;

    return {
        questions,
        userAnswers: sanitizeAnswers(questions, data.userAnswers),
        currentIndex,
        accumulatedMs
    };
};

const isValidDate = value =>
    isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());

/**
 * Normaliza un intento y recalcula sus métricas desde los snapshots.
 * @param {unknown} attempt Intento guardado.
 * @returns {object|null} Intento normalizado o `null` si no es representable.
 */
export const normalizeAttempt = attempt => {
    if (!isPlainObject(attempt) || !isNonEmptyString(attempt.id)) return null;

    const snapshot = attempt.questionsSnapshot;
    if (!Array.isArray(snapshot) || snapshot.length === 0) return null;
    if (!snapshot.every(isValidQuestion)) return null;
    if (!isPlainObject(attempt.userAnswersSnapshot)) return null;

    const answers = sanitizeAnswers(snapshot, attempt.userAnswersSnapshot);
    const metrics = scoreQuiz(snapshot, answers);
    const totalTimeSeconds = Number.isFinite(attempt.totalTimeSeconds) && attempt.totalTimeSeconds >= 0
        ? Math.floor(attempt.totalTimeSeconds)
        : 0;

    return {
        id: attempt.id,
        date: isValidDate(attempt.date) ? attempt.date : '',
        candidateAlias: isNonEmptyString(attempt.candidateAlias)
            ? attempt.candidateAlias.trim()
            : DEFAULT_ALIAS,
        totalQuestions: snapshot.length,
        hits: metrics.hits,
        errors: metrics.errors,
        unanswered: metrics.unanswered,
        scorePct: metrics.scorePct,
        totalTimeSeconds,
        questionsSnapshot: snapshot,
        userAnswersSnapshot: answers
    };
};

/**
 * Filtra las entradas no representables sin lanzar ni reescribir el historial.
 * @param {unknown} history Historial crudo.
 * @returns {Array<object>} Intentos normalizados.
 */
export const normalizeHistory = history =>
    Array.isArray(history) ? history.map(normalizeAttempt).filter(Boolean) : [];

// --- TEXTOS DEL BANNER DE RECUPERACIÓN ---

/**
 * Compone un recuento con la forma singular o plural adecuada.
 * @param {number} count Cantidad.
 * @param {string} singular Forma para 1.
 * @param {string} plural Forma para el resto.
 * @returns {string} Texto como `3 preguntas`.
 */
export const pluralize = (count, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`;

/**
 * Cuenta solo respuestas no vacías que pertenecen a una opción de su pregunta.
 * @param {unknown} questions Cuestionario.
 * @param {unknown} answers Respuestas.
 * @returns {number} Número de preguntas respondidas válidamente.
 */
export const countAnswered = (questions, answers) => {
    if (!Array.isArray(questions) || !isPlainObject(answers)) return 0;

    return questions.reduce((count, question) => {
        if (!isValidQuestion(question)) return count;

        const value = answers[question.id];
        if (!isNonEmptyString(value)) return count;

        const belongsToQuestion = question.options.some(option => option.id === value);
        return belongsToQuestion ? count + 1 : count;
    }, 0);
};

/**
 * Compone el texto del banner de recuperación. Sin preguntas devuelve cadena vacía.
 * @param {unknown} questions Cuestionario guardado.
 * @param {unknown} answers Respuestas guardadas.
 * @returns {string} Texto completo del aviso.
 */
export const formatRecoveryInfo = (questions, answers) => {
    if (!Array.isArray(questions) || questions.length === 0) return '';

    const total = questions.length;
    const answered = countAnswered(questions, answers);
    const base = `Hay un examen de ${pluralize(total, 'pregunta', 'preguntas')} en curso`;

    if (answered === 0) return `${base}.`;
    return `${base} (${pluralize(answered, 'respondida', 'respondidas')}).`;
};

// --- PAGINACIÓN ---

/**
 * Número de intentos que se muestran por página en el historial.
 * @type {number}
 */
export const HISTORY_PAGE_SIZE = 10;

/**
 * Pagina una lista sin mutarla. `page` es 1-based y se recorta al rango válido.
 * @param {unknown} list Lista a paginar; si no es array se trata como vacía.
 * @param {number} [page=1] Página solicitada.
 * @param {number} [pageSize=HISTORY_PAGE_SIZE] Tamaño de página.
 * @returns {{items: unknown[], page: number, pageSize: number, total: number, totalPages: number, hasMore: boolean, remaining: number}} Resultado de la paginación.
 */
export const paginate = (list, page = 1, pageSize = HISTORY_PAGE_SIZE) => {
    const items = Array.isArray(list) ? list : [];
    const total = items.length;
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : HISTORY_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const current = Number.isInteger(page)
        ? Math.min(Math.max(page, 1), totalPages)
        : 1;
    const start = (current - 1) * size;

    return {
        items: items.slice(start, start + size),
        page: current,
        pageSize: size,
        total,
        totalPages,
        hasMore: current < totalPages,
        remaining: Math.max(0, total - current * size)
    };
};

/**
 * Calcula la corrección del cuestionario.
 * @param {Array<object>} questions Cuestionario.
 * @param {Record<string, string>} answers Respuestas del aspirante.
 * @returns {{hits: number, errors: number, unanswered: number, scorePct: number}} Métricas de corrección.
 */
export const scoreQuiz = (questions, answers) => {
    if (!Array.isArray(questions) || questions.length === 0) {
        return { hits: 0, errors: 0, unanswered: 0, scorePct: 0 };
    }

    let hits = 0;
    let errors = 0;
    let unanswered = 0;

    questions.forEach(q => {
        const ans = answers[q.id];
        if (!ans) unanswered++;
        else if (ans === q.correctOption) hits++;
        else errors++;
    });

    return { hits, errors, unanswered, scorePct: (hits / questions.length) * 100 };
};

/**
 * Crea el intento que se guarda en el historial.
 * @param {{questions: Array<object>, userAnswers: Record<string, string>, alias: string, totalTimeSeconds: number, now?: number, date?: Date}} attempt Datos del intento.
 * @returns {object} Intento con métricas y snapshots.
 */
export const createAttempt = ({
    questions,
    userAnswers,
    alias,
    totalTimeSeconds,
    now = Date.now(),
    date = new Date()
}) => {
    const { hits, errors, unanswered, scorePct } = scoreQuiz(questions, userAnswers);

    return {
        id: 'att_' + now,
        date: date.toISOString(),
        candidateAlias: (alias || '').trim() || DEFAULT_ALIAS,
        totalQuestions: questions.length,
        hits,
        errors,
        unanswered,
        scorePct,
        totalTimeSeconds,
        questionsSnapshot: questions,
        userAnswersSnapshot: userAnswers
    };
};

// --- FORMATO ---

/**
 * Formatea una duración en segundos como `mm:ss` o `hh:mm:ss`.
 * @param {unknown} seconds Segundos transcurridos.
 * @returns {string} Tiempo formateado; `00:00` si el valor no es válido.
 */
export const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/**
 * Formatea un porcentaje con dos decimales y coma decimal española.
 * @param {unknown} value Valor numérico.
 * @returns {string} Porcentaje como `45,00 %` o `—` si no es finito.
 */
export const formatPct = value => {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(2).replace('.', ',')} %`;
};

/**
 * Formatea una fecha ISO en formato local español.
 * @param {unknown} iso Cadena de fecha ISO.
 * @returns {string} Fecha y hora local, o `—` si no es válida.
 */
export const formatDate = iso => {
    if (!isNonEmptyString(iso)) return '—';

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * Escapa los caracteres peligrosos de un texto antes de insertarlo como HTML.
 * @param {unknown} str Valor a escapar.
 * @returns {string} Texto con `&`, `<`, `>` y `"` neutralizados.
 */
export const escapeHTML = str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
