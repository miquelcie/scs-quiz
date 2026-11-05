import { QUESTION_BANK } from './questions.js';
import { Storage } from './storage.js';
import {
    buildActiveQuizSnapshot,
    buildQuiz,
    createAttempt,
    escapeHTML,
    formatDate,
    formatPct,
    formatTime,
    isQuizInProgress,
    moveIndex,
    toggleAnswer
} from './engine.js';

// --- ESTADO Y TIMER ---
const state = {
    alias: '',
    questions: [],
    userAnswers: {},
    currentIndex: 0,
    accumulatedMs: 0,
    startTimestamp: 0,
    timerInterval: null
};

const startTimer = () => {
    stopTimer();
    state.startTimestamp = Date.now();
    const update = () => {
        const totalSec = Math.floor((state.accumulatedMs + (Date.now() - state.startTimestamp)) / 1000);
        document.getElementById('quiz-timer').textContent = formatTime(totalSec);
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
const persistActiveQuiz = () => {
    const quizScreen = document.getElementById('screen-quiz');
    if (!quizScreen?.classList.contains('active')) return;
    if (!isQuizInProgress(state.questions, state.currentIndex)) return;
    saveActiveQuizNow();
};

const navigate = delta => {
    const nextIndex = moveIndex(state.currentIndex, state.questions.length, delta);
    if (nextIndex === state.currentIndex) return;

    state.currentIndex = nextIndex;
    persistActiveQuiz();
    renderQuestion();
};

// --- NAVEGACIÓN Y MODAL ---
const switchScreen = screenId => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`)?.classList.add('active');
    window.scrollTo(0, 0);
};

const showModal = (title, msg, onConfirm) => {
    const modal = document.getElementById('custom-modal');
    const btnConfirm = document.getElementById('modal-confirm');
    const btnCancel = document.getElementById('modal-cancel');
    const previouslyFocused = document.activeElement;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-msg').textContent = msg;

    const cleanup = (restoreFocus = true) => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        btnConfirm.removeEventListener('click', handleConfirm);
        btnCancel.removeEventListener('click', cleanup);
        modal.removeEventListener('keydown', handleKeydown);
        if (restoreFocus) previouslyFocused?.focus?.();
    };

    const handleConfirm = () => {
        cleanup(false);
        onConfirm();
    };

    const handleKeydown = e => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cleanup();
        }
    };

    btnConfirm.addEventListener('click', handleConfirm);
    btnCancel.addEventListener('click', cleanup);
    modal.addEventListener('keydown', handleKeydown);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    btnConfirm.focus();
};

// --- RENDERIZADO DE VISTAS ---
const renderQuestion = (focusOptionIndex = null) => {
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;
    const progress = Math.round(((state.currentIndex + 1) / total) * 100);

    document.getElementById('q-current').textContent = state.currentIndex + 1;
    document.getElementById('q-total').textContent = total;
    document.getElementById('q-folio').textContent = state.currentIndex + 1;
    document.getElementById('progress-bar-fill').style.width = `${progress}%`;
    document.getElementById('progress-bar-bg').setAttribute('aria-valuenow', progress);
    document.getElementById('question-statement').textContent = q.statement;

    const container = document.getElementById('options-container');
    const fragment = document.createDocumentFragment();
    const prefixes = ['A', 'B', 'C', 'D', 'E'];

    q.options.forEach((opt, idx) => {
        const isSelected = state.userAnswers[q.id] === opt.id;
        const item = document.createElement('div');
        item.className = `option-item ${isSelected ? 'selected' : ''}`;
        item.tabIndex = 0;
        item.setAttribute('role', 'radio');
        item.setAttribute('aria-checked', String(isSelected));
        item.innerHTML = `
            <div class="option-prefix">${prefixes[idx] || idx + 1}</div>
            <div class="option-text">${escapeHTML(opt.text)}</div>
        `;

        const selectAnswer = () => {
            toggleAnswer(state.userAnswers, q.id, opt.id);
            persistActiveQuiz();
        };

        item.addEventListener('click', () => {
            selectAnswer();
            renderQuestion();
        });

        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectAnswer();
                renderQuestion(idx);
            }
        });

        fragment.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    if (focusOptionIndex !== null) {
        container.children[focusOptionIndex]?.focus();
    }

    document.getElementById('btn-prev-q').disabled = state.currentIndex === 0;
    document.getElementById('btn-next-q').textContent = state.currentIndex === total - 1 ? 'Finalizar test' : 'Siguiente';
};

const renderResults = (attempt) => {
    switchScreen('results');
    document.getElementById('results-candidate').textContent = `Aspirante: ${attempt.candidateAlias}. ${formatDate(attempt.date)}`;
    document.getElementById('res-score-pct').textContent = formatPct(attempt.scorePct);
    document.getElementById('res-hits').textContent = attempt.hits;
    document.getElementById('res-errors').textContent = attempt.errors;
    document.getElementById('res-blank').textContent = attempt.unanswered;
    document.getElementById('res-time-total').textContent = formatTime(attempt.totalTimeSeconds);

    const container = document.getElementById('review-container');
    const fragment = document.createDocumentFragment();
    const prefixes = ['A', 'B', 'C', 'D', 'E'];

    attempt.questionsSnapshot.forEach((q, idx) => {
        const userChoice = attempt.userAnswersSnapshot[q.id];
        const isCorrect = userChoice === q.correctOption;
        const isBlank = !userChoice;

        let badge = isCorrect ? '<span class="status-badge badge-correct">Correcta</span>' :
                    isBlank ? '<span class="status-badge badge-unanswered">Sin responder</span>' :
                    '<span class="status-badge badge-incorrect">Incorrecta</span>';
        let statusClass = isCorrect ? 'status-correct' : isBlank ? 'status-unanswered' : 'status-incorrect';

        const item = document.createElement('div');
        item.className = `review-item ${statusClass}`;

        let optionsHTML = '';
        q.options.forEach((opt, optIdx) => {
            const isRight = q.correctOption === opt.id;
            const isUser = userChoice === opt.id;
            let style = isRight ? 'is-correct' : (isUser ? 'is-user' : '');
            let tag = isRight ? 'Respuesta correcta' : (isUser ? 'Tu respuesta' : '');

            optionsHTML += `
                <div class="review-option ${style}">
                    <span><strong>${prefixes[optIdx]}:</strong> ${escapeHTML(opt.text)}</span>
                    <span class="option-tag">${tag}</span>
                </div>`;
        });

        item.innerHTML = `
            <div>${badge}</div>
            <p class="review-statement">${idx + 1}. ${escapeHTML(q.statement)}</p>
            <div>${optionsHTML}</div>
            ${q.explanation ? `<div class="explanation-box"><strong>Explicación:</strong> ${escapeHTML(q.explanation)}</div>` : ''}
        `;
        fragment.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
};

const renderLastAttempt = () => {
    const history = Storage.getHistory();
    const container = document.getElementById('last-attempt-content');
    if (!history.length) {
        container.innerHTML = `<p class="empty-state">Todavía no has completado ningún simulacro. Cuando termines el primero, aquí verás tu nota.</p>`;
        return;
    }
    const last = history[0];
    container.innerHTML = `
        <div class="last-score">
            <span class="last-score-value">${formatPct(last.scorePct)}</span>
            <span class="last-score-detail">${last.hits} de ${last.totalQuestions} aciertos</span>
        </div>
        <dl class="last-meta">
            <div><dt>Fecha</dt><dd>${formatDate(last.date)}</dd></div>
            <div><dt>Tiempo</dt><dd>${formatTime(last.totalTimeSeconds)}</dd></div>
        </dl>
        <button id="btn-view-last" class="btn btn-secondary btn-sm w-full">Revisar intento</button>`;
    document.getElementById('btn-view-last').addEventListener('click', () => renderResults(last));
};

// Vuelve a la portada con la tarjeta «Último resultado» ya actualizada.
// El render va antes del cambio de pantalla para que el foco (006) caiga sobre contenido vigente.
const returnHome = () => {
    renderLastAttempt();
    switchScreen('home');
};

const renderHistoryScreen = () => {
    switchScreen('history');
    const history = Storage.getHistory();
    const container = document.getElementById('history-list-container');
    if (!history.length) {
        container.innerHTML = `<p class="empty-state is-centered">Todavía no hay intentos guardados. Completa un simulacro y aparecerá aquí.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div class="history-main">
                <div class="history-title">Examen de ${item.totalQuestions} preguntas</div>
                <div class="history-meta">
                    <span>${escapeHTML(item.candidateAlias)}</span>
                    <span>${formatDate(item.date)}</span>
                </div>
                <div class="history-stats">
                    <span><strong>${item.hits}</strong> aciertos</span>
                    <span><strong>${item.errors}</strong> errores</span>
                    <span><strong>${item.unanswered}</strong> sin responder</span>
                </div>
            </div>
            <div class="history-side">
                <div class="history-result">
                    <div class="history-score">${formatPct(item.scorePct)}</div>
                    <div class="history-time">${formatTime(item.totalTimeSeconds)}</div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary btn-sm btn-view" data-id="${item.id}">Ver</button>
                    <button class="btn btn-danger btn-sm btn-del" data-id="${item.id}" aria-label="Eliminar este intento">Eliminar</button>
                </div>
            </div>`;
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    container.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', e => {
            const found = history.find(h => h.id === e.target.dataset.id);
            if (found) renderResults(found);
        });
    });

    container.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', e => {
            showModal("Eliminar intento", "¿Deseas eliminar este registro?", () => {
                Storage.deleteAttempt(e.target.dataset.id);
                renderHistoryScreen();
                renderLastAttempt();
            });
        });
    });
};

// --- FLUJO DE EXAMEN ---
const startQuiz = (savedQuiz = null) => {
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
        const count = document.getElementById('num-questions-select').value;

        // Las preguntas se barajan, pero las opciones conservan el orden
        // exacto definido en QUESTION_BANK.
        state.questions = buildQuiz(QUESTION_BANK, count);
        state.userAnswers = {};
        state.currentIndex = 0;
        state.accumulatedMs = 0;
        saveActiveQuizNow();
    }

    document.getElementById('recovery-banner').hidden = true;
    switchScreen('quiz');
    startTimer();
    renderQuestion();
};

const finishQuiz = () => {
    const total = state.questions.length;
    const answered = Object.keys(state.userAnswers).length;
    const pending = total - answered;

    const processFinish = () => {
        stopTimer();
        Storage.clearActiveQuiz();

        const attempt = createAttempt({
            questions: state.questions,
            userAnswers: state.userAnswers,
            alias: state.alias,
            totalTimeSeconds: Math.floor(state.accumulatedMs / 1000)
        });

        Storage.saveAttempt(attempt);
        renderResults(attempt);
    };

    if (pending > 0) {
        const pendingLabel = pending === 1 ? '1 pregunta sin responder' : `${pending} preguntas sin responder`;
        showModal("Preguntas pendientes", `Tienes ${pendingLabel} de ${total}. ¿Deseas finalizar de todos modos?`, processFinish);
    } else {
        processFinish();
    }
};

// --- INICIALIZACIÓN Y BINDINGS ---
document.addEventListener('DOMContentLoaded', () => {
    state.alias = Storage.getAlias();
    const aliasInput = document.getElementById('input-alias');
    aliasInput.value = state.alias;
    document.getElementById('display-alias').textContent = state.alias.trim() || 'Aspirante';
    document.getElementById('available-info').textContent = `${QUESTION_BANK.length} preguntas disponibles con respuesta verificada.`;
    document.getElementById('hero-bank').textContent = `${QUESTION_BANK.length} preguntas verificadas`;

    aliasInput.addEventListener('input', e => {
        state.alias = e.target.value;
        Storage.setAlias(state.alias);
        document.getElementById('display-alias').textContent = state.alias.trim() || 'Aspirante';
    });

    const activeQuiz = Storage.getActiveQuiz();
    if (activeQuiz && activeQuiz.questions?.length) {
        document.getElementById('recovery-info').textContent = `Hay un examen de ${activeQuiz.questions.length} preguntas en curso (${Object.keys(activeQuiz.userAnswers || {}).length} respondidas).`;
        document.getElementById('recovery-banner').hidden = false;
    }

    document.getElementById('btn-start-quiz').addEventListener('click', () => startQuiz());
    document.getElementById('btn-resume-quiz').addEventListener('click', () => startQuiz(Storage.getActiveQuiz()));
    document.getElementById('btn-discard-quiz').addEventListener('click', () => {
        showModal("Descartar examen", "¿Deseas borrar el cuestionario interrumpido?", () => {
            Storage.clearActiveQuiz();
            document.getElementById('recovery-banner').hidden = true;
        });
    });

    document.getElementById('btn-prev-q').addEventListener('click', () => navigate(-1));

    document.getElementById('btn-next-q').addEventListener('click', () => {
        if (state.currentIndex < state.questions.length - 1) navigate(1);
        else finishQuiz();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) persistActiveQuiz();
    });
    window.addEventListener('pagehide', persistActiveQuiz);

    document.getElementById('btn-finish-quiz').addEventListener('click', finishQuiz);
    document.getElementById('btn-restart-from-res').addEventListener('click', returnHome);
    document.getElementById('btn-home-from-res').addEventListener('click', returnHome);
    document.getElementById('btn-view-history').addEventListener('click', renderHistoryScreen);
    document.getElementById('btn-back-home-history').addEventListener('click', returnHome);
    document.getElementById('btn-clear-history').addEventListener('click', () => {
        showModal("Borrar historial local", "¿Deseas borrar todo el historial de exámenes?", () => {
            Storage.clearHistory();
            renderLastAttempt();
        });
    });

    renderLastAttempt();
});
