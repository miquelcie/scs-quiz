// --- LÓGICA PURA DEL EXAMEN ---
// Sin DOM ni almacenamiento: funciones verificables con `node --test`.

const DEFAULT_ALIAS = 'Aspirante';

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
    const shuffledBank = shuffle(bank, random);
    const actualCount = count === 'max'
        ? shuffledBank.length
        : Math.min(parseInt(count, 10), shuffledBank.length);
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

// Corrección del cuestionario.
export const scoreQuiz = (questions, answers) => {
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
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const formatPct = value => `${value.toFixed(2).replace('.', ',')} %`;

export const formatDate = iso => new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

export const escapeHTML = str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
