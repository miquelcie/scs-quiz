// --- LÓGICA PURA DEL EXAMEN ---
// Sin DOM ni almacenamiento: funciones verificables con `node --test`.

const DEFAULT_ALIAS = 'Aspirante';

// --- ALIAS DE USUARIO ---

export const ALIAS_MAX_LENGTH = 30;

// Letras Unicode (tildes, ñ), dígitos, guion y guion bajo. Sin espacios ni símbolos.
export const ALIAS_PATTERN = /^[\p{L}\p{N}_-]+$/u;

// Elimina cualquier carácter no permitido y recorta a la longitud máxima.
// Los valores que no son cadena se tratan como alias vacío.
export const sanitizeAlias = value => {
    if (typeof value !== 'string') return '';
    return value.replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, ALIAS_MAX_LENGTH);
};

// La cadena vacía es válida: el alias es opcional.
export const isValidAlias = value => {
    if (value === '') return true;
    if (typeof value !== 'string') return false;
    if (value.length > ALIAS_MAX_LENGTH) return false;
    return ALIAS_PATTERN.test(value);
};


// Baraja una copia del array. `random` es inyectable para tests deterministas.
export const shuffle = (array, random = Math.random) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// Construye el cuestionario: baraja preguntas y conserva el orden de las opciones.
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

// Marca, cambia o desmarca una respuesta. Muta y devuelve el objeto de respuestas.
export const toggleAnswer = (answers, questionId, optionId) => {
    if (answers[questionId] === optionId) delete answers[questionId];
    else answers[questionId] = optionId;
    return answers;
};

// Instantánea que se guarda para recuperar un examen interrumpido.
export const buildActiveQuizSnapshot = ({ questions, userAnswers, currentIndex, accumulatedMs }) => ({
    questions,
    userAnswers,
    currentIndex,
    accumulatedMs
});

// Calcula el índice destino con límites. Un `delta` 0 recorta un índice guardado.
export const moveIndex = (currentIndex, total, delta) => {
    const length = Number.isInteger(total) && total > 0 ? total : 0;
    if (length === 0) return 0;

    const step = Number.isInteger(delta) ? delta : 0;
    const current = Number.isInteger(currentIndex) ? currentIndex : 0;
    return Math.min(Math.max(current + step, 0), length - 1);
};

// Calcula el siguiente control del ciclo de foco. Sin controles devuelve 0 y
// un índice inválido se normaliza al primero antes de aplicar el paso.
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

// Verdadero solo si hay un cuestionario y el índice es un entero dentro de rango.
export const isQuizInProgress = (questions, currentIndex) =>
    Array.isArray(questions) &&
    questions.length > 0 &&
    Number.isInteger(currentIndex) &&
    currentIndex >= 0 &&
    currentIndex < questions.length;

// --- VALIDACIÓN DE DATOS PERSISTIDOS ---

export const isPlainObject = value =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

export const isNonEmptyString = value =>
    typeof value === 'string' && value.trim() !== '';

const isValidOption = option =>
    isPlainObject(option) && isNonEmptyString(option.id);

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

export const isValidActiveQuizShape = data =>
    isPlainObject(data) &&
    Array.isArray(data.questions) &&
    data.questions.length > 0 &&
    data.questions.every(isValidQuestion) &&
    isPlainObject(data.userAnswers) &&
    Number.isInteger(data.currentIndex);

// Solo conserva respuestas de preguntas propias, con texto no vacío y opción existente.
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

// Valida la estructura, recorta el índice y normaliza respuestas y tiempo.
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

// Normaliza un intento y recalcula sus métricas desde los snapshots.
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

// Filtra las entradas no representables sin lanzar ni reescribir el historial.
export const normalizeHistory = history =>
    Array.isArray(history) ? history.map(normalizeAttempt).filter(Boolean) : [];

// --- TEXTOS DEL BANNER DE RECUPERACIÓN ---

export const pluralize = (count, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`;

// Cuenta solo respuestas no vacías que pertenecen a una opción de su pregunta.
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

// Texto completo del banner; sin preguntas devuelve cadena vacía y nunca lanza.
export const formatRecoveryInfo = (questions, answers) => {
    if (!Array.isArray(questions) || questions.length === 0) return '';

    const total = questions.length;
    const answered = countAnswered(questions, answers);
    const base = `Hay un examen de ${pluralize(total, 'pregunta', 'preguntas')} en curso`;

    if (answered === 0) return `${base}.`;
    return `${base} (${pluralize(answered, 'respondida', 'respondidas')}).`;
};

// Corrección del cuestionario.
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

// Intento que se guarda en el historial.
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

export const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const formatPct = value => {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(2).replace('.', ',')} %`;
};

export const formatDate = iso => {
    if (!isNonEmptyString(iso)) return '—';

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
};

export const escapeHTML = str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
