// Ciclo de vida del examen: arranque, navegación, cronómetro, finalización y persistencia.

import {
    buildActiveQuizSnapshot,
    buildQuiz,
    createAttempt,
    formatDate,
    formatPct,
    formatTime,
    isQuizInProgress,
    moveIndex,
    pluralize
} from '../engine.js';
import { HISTORY_LIMIT, Storage } from '../storage.js';
import { IDS, SCREENS, byId } from '../dom.js';
import { state } from '../state.js';
import { showModal, showStorageError, switchScreen } from '../ui/modal.js';
import { renderQuestion, renderResults } from '../ui/render.js';

const DISCARD_ACTIVE_QUIZ_MESSAGE = 'Hay un examen en curso con respuestas guardadas. Si empiezas uno nuevo, se descartará y no podrás recuperarlo.';

const HISTORY_FULL_TITLE = 'Historial completo';
const HISTORY_FULL_MESSAGE = 'El historial ha alcanzado el máximo de {limit} intentos. Para guardar este simulacro se eliminará {oldest}. ¿Deseas continuar?';
const NOT_SAVED_MESSAGE = 'El intento no se ha guardado porque el historial está completo. Puedes ver el resultado ahora, pero se perderá al salir de esta pantalla.';

const buildHistoryFullMessage = oldest =>
    HISTORY_FULL_MESSAGE.replace('{limit}', String(HISTORY_LIMIT)).replace('{oldest}', oldest);

// --- CRONÓMETRO Y PERSISTENCIA ---

const startTimer = () => {
    stopTimer();
    state.startTimestamp = Date.now();
    const update = () => {
        const totalSec = Math.floor((state.accumulatedMs + (Date.now() - state.startTimestamp)) / 1000);
        byId(IDS.QUIZ_TIMER).textContent = formatTime(totalSec);
    };
    update();
    state.timerInterval = setInterval(update, 1000);
};

const stopTimer = () => {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.accumulatedMs += Date.now() - state.startTimestamp;
    }
};

const saveActiveQuizNow = () => {
    Storage.setActiveQuiz(buildActiveQuizSnapshot({
        questions: state.questions,
        userAnswers: state.userAnswers,
        currentIndex: state.currentIndex,
        accumulatedMs: state.accumulatedMs + (state.timerInterval ? Date.now() - state.startTimestamp : 0)
    }));
};

// Guarda solo si el examen sigue activo: pantalla de cuestionario y cuestionario cargado.
export const persistActiveQuiz = () => {
    const quizScreen = byId(`screen-${SCREENS.QUIZ}`);
    if (!quizScreen?.classList.contains('active')) return;
    if (!isQuizInProgress(state.questions, state.currentIndex)) return;
    saveActiveQuizNow();
};

export const navigate = delta => {
    const nextIndex = moveIndex(state.currentIndex, state.questions.length, delta);
    if (nextIndex === state.currentIndex) return;

    state.currentIndex = nextIndex;
    persistActiveQuiz();
    renderQuestion();
};

// --- ARRANQUE ---

const confirmDiscardActiveQuiz = bank => {
    Storage.clearActiveQuiz();
    startQuiz(null, bank);
};

// Relee el examen activo en el clic para no decidir con un banner obsoleto.
export const handleStartQuiz = bank => {
    const activeQuiz = Storage.getActiveQuiz();
    if (!activeQuiz) {
        startQuiz(null, bank);
        return;
    }
    showModal('Examen en curso', DISCARD_ACTIVE_QUIZ_MESSAGE, () => confirmDiscardActiveQuiz(bank));
};

export const startQuiz = (savedQuiz = null, bank = []) => {
    if (savedQuiz) {
        state.questions = savedQuiz.questions;
        state.userAnswers = savedQuiz.userAnswers || {};
        state.currentIndex = moveIndex(
            savedQuiz.currentIndex ?? 0,
            Array.isArray(savedQuiz.questions) ? savedQuiz.questions.length : 0,
            0
        );
        state.accumulatedMs = savedQuiz.accumulatedMs || 0;
    } else {
        const count = byId(IDS.NUM_QUESTIONS).value;

        // Las preguntas se barajan, pero las opciones conservan el orden
        // exacto definido en QUESTION_BANK.
        state.questions = buildQuiz(bank, count);
        state.userAnswers = {};
        state.currentIndex = 0;
        state.accumulatedMs = 0;
        saveActiveQuizNow();
    }

    byId(IDS.RECOVERY_BANNER).hidden = true;
    startTimer();
    renderQuestion();
    switchScreen(SCREENS.QUIZ);
};

// --- FINALIZACIÓN ---

const createCurrentAttempt = () => createAttempt({
    questions: state.questions,
    userAnswers: state.userAnswers,
    alias: state.alias,
    totalTimeSeconds: Math.floor(state.accumulatedMs / 1000)
});

// Describe la entrada más antigua representable del historial para el aviso.
const describeOldestAttempt = () => {
    const history = Storage.getHistory();
    const oldest = history[history.length - 1];
    if (!oldest) return 'la entrada más antigua';
    return `el intento del ${formatDate(oldest.date)} (${formatPct(Number(oldest.scorePct))})`;
};

// Muestra el resultado sin guardarlo en el historial (cancelación de la rotación).
const showResultWithoutSaving = () => {
    stopTimer();
    Storage.clearActiveQuiz();
    const attempt = createCurrentAttempt();
    renderResults(attempt);
    showStorageError('Intento no guardado', NOT_SAVED_MESSAGE);
};

const persistAndShow = ({ rotate }) => {
    stopTimer();
    const willRotate = Storage.getHistoryLength() >= HISTORY_LIMIT;

    if (willRotate && !rotate) {
        showModal(
            HISTORY_FULL_TITLE,
            buildHistoryFullMessage(describeOldestAttempt()),
            () => persistAndShow({ rotate: true }),
            showResultWithoutSaving
        );
        return;
    }

    const activeCleared = Storage.clearActiveQuiz();
    const attempt = createCurrentAttempt();
    const saved = Storage.saveAttempt(attempt, { rotate: willRotate });

    renderResults(attempt);

    if (!saved) {
        showStorageError(
            'No se pudo guardar',
            'El intento no se pudo guardar en este navegador. El resultado se muestra, pero se perderá al recargar.'
        );
    } else if (!activeCleared) {
        showStorageError(
            'No se pudo borrar el examen en curso',
            'El intento se ha guardado, pero el examen en curso sigue almacenado y podría reaparecer al recargar.'
        );
    }
};

export const finishQuiz = () => {
    const total = state.questions.length;
    const answered = Object.keys(state.userAnswers).length;
    const pending = total - answered;

    const processFinish = () => persistAndShow({ rotate: false });

    if (pending > 0) {
        const pendingLabel = pluralize(pending, 'pregunta sin responder', 'preguntas sin responder');
        showModal('Preguntas pendientes', `Tienes ${pendingLabel} de ${total}. ¿Deseas finalizar de todos modos?`, processFinish);
    } else {
        processFinish();
    }
};
