import { QUESTION_BANK } from './questions.js';
import { Storage } from './storage.js';

// --- UTILIDADES ---
const shuffle = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const escapeHTML = str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

const persistActiveQuiz = () => {
    Storage.setActiveQuiz({
        questions: state.questions,
        userAnswers: state.userAnswers,
        currentIndex: state.currentIndex,
        accumulatedMs: state.accumulatedMs + (state.timerInterval ? Date.now() - state.startTimestamp : 0)
    });
};

// --- NAVEGACIÓN Y MODAL ---
const switchScreen = screenId => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`)?.classList.add('active');
    window.scrollTo(0, 0);
};

const showModal = (title, msg, onConfirm) => {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-msg').textContent = msg;

    const cleanup = () => {
        modal.classList.remove('active');
        btnConfirm.removeEventListener('click', handleConfirm);
        btnCancel.removeEventListener('click', cleanup);
    };

    const handleConfirm = () => { cleanup(); onConfirm(); };
    const btnConfirm = document.getElementById('modal-confirm');
    const btnCancel = document.getElementById('modal-cancel');

    btnConfirm.addEventListener('click', handleConfirm);
    btnCancel.addEventListener('click', cleanup);
    modal.classList.add('active');
};

// --- RENDERIZADO DE VISTAS ---
const renderQuestion = () => {
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;

    document.getElementById('q-current').textContent = state.currentIndex + 1;
    document.getElementById('q-total').textContent = total;
    document.getElementById('progress-bar-fill').style.width = `${((state.currentIndex + 1) / total) * 100}%`;
    document.getElementById('question-statement').textContent = `${state.currentIndex + 1}. ${q.statement}`;

    const container = document.getElementById('options-container');
    const fragment = document.createDocumentFragment();
    const prefixes = ['A', 'B', 'C', 'D', 'E'];

    q.options.forEach((opt, idx) => {
        const item = document.createElement('div');
        item.className = `option-item ${state.userAnswers[q.id] === opt.id ? 'selected' : ''}`;
        item.innerHTML = `
            <div class="option-prefix">${prefixes[idx] || idx + 1}</div>
            <div class="option-text">${escapeHTML(opt.text)}</div>
        `;
        item.addEventListener('click', () => {
            if (state.userAnswers[q.id] === opt.id) delete state.userAnswers[q.id];
            else state.userAnswers[q.id] = opt.id;
            persistActiveQuiz();
            renderQuestion();
        });
        fragment.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    document.getElementById('btn-prev-q').disabled = state.currentIndex === 0;
    document.getElementById('btn-next-q').textContent = state.currentIndex === total - 1 ? 'Finalizar Test 🏁' : 'Siguiente ➡️';
};

const renderResults = (attempt) => {
    switchScreen('results');
    document.getElementById('results-candidate').textContent = `Aspirante: ${attempt.candidateAlias} | Fecha: ${new Date(attempt.date).toLocaleString()}`;
    document.getElementById('res-score-pct').textContent = `${attempt.scorePct.toFixed(2)}%`;
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

        let badge = isCorrect ? '<span class="status-badge badge-correct">✅ Correcta</span>' :
                    isBlank ? '<span class="status-badge badge-unanswered">⚠️ Sin responder</span>' :
                    '<span class="status-badge badge-incorrect">❌ Incorrecta</span>';
        let statusClass = isCorrect ? 'status-correct' : isBlank ? 'status-unanswered' : 'status-incorrect';

        const item = document.createElement('div');
        item.className = `review-item ${statusClass}`;

        let optionsHTML = '';
        q.options.forEach((opt, optIdx) => {
            const isRight = q.correctOption === opt.id;
            const isUser = userChoice === opt.id;
            let style = isRight ? 'is-correct' : (isUser ? 'is-user' : '');
            let tag = isRight ? '✓ Respuesta Correcta' : (isUser ? '✗ Tu Respuesta' : '');

            optionsHTML += `
                <div class="review-option ${style}">
                    <span><strong>${prefixes[optIdx]}:</strong> ${escapeHTML(opt.text)}</span>
                    <span style="font-size:0.75rem; font-weight:700;">${tag}</span>
                </div>`;
        });

        item.innerHTML = `
            <div>${badge}</div>
            <p style="font-weight:700; margin-bottom:8px;">${idx + 1}. ${escapeHTML(q.statement)}</p>
            <div>${optionsHTML}</div>
            ${q.explanation ? `<div class="explanation-box">💡 <strong>Explicación:</strong> ${escapeHTML(q.explanation)}</div>` : ''}
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
        container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No hay simulacros completados todavía.</p>`;
        return;
    }
    const last = history[0];
    container.innerHTML = `
        <div style="font-size:0.9rem;">
            <p style="margin-bottom:4px;">📅 <strong>${new Date(last.date).toLocaleDateString()} ${new Date(last.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong></p>
            <p style="margin-bottom:4px;">🎯 Nota: <strong style="color:var(--scs-blue);">${last.scorePct.toFixed(2)}%</strong> (${last.hits}/${last.totalQuestions})</p>
            <p style="margin-bottom:8px;">⏱️ Tiempo: <strong>${formatTime(last.totalTimeSeconds)}</strong></p>
            <button id="btn-view-last" class="btn btn-secondary btn-sm w-full">Revisar Intento</button>
        </div>`;
    document.getElementById('btn-view-last').addEventListener('click', () => renderResults(last));
};

const renderHistoryScreen = () => {
    switchScreen('history');
    const history = Storage.getHistory();
    const container = document.getElementById('history-list-container');
    if (!history.length) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:2rem;">El historial de intentos está vacío.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div>
                <div style="font-weight:800; color:var(--scs-blue);">Examen de ${item.totalQuestions} Preguntas</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">
                    👤 ${escapeHTML(item.candidateAlias)} | 📅 ${new Date(item.date).toLocaleDateString()} ${new Date(item.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </div>
                <div style="font-size:0.85rem; margin-top:4px;">
                    Resultado: <strong style="color:var(--scs-blue);">${item.scorePct.toFixed(2)}%</strong> (${item.hits} aciertos, ${item.errors} errores) | ⏱️ ${formatTime(item.totalTimeSeconds)}
                </div>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-sm btn-view" data-id="${item.id}">Ver</button>
                <button class="btn btn-danger btn-sm btn-del" data-id="${item.id}">🗑️</button>
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
            showModal("Eliminar Intento", "¿Deseas eliminar este registro?", () => {
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
        state.currentIndex = savedQuiz.currentIndex || 0;
        state.accumulatedMs = savedQuiz.accumulatedMs || 0;
    } else {
        const count = document.getElementById('num-questions-select').value;
        const shuffledBank = shuffle(QUESTION_BANK);
        const actualCount = count === 'max' ? shuffledBank.length : Math.min(parseInt(count, 10), shuffledBank.length);

        state.questions = shuffledBank.slice(0, actualCount).map(q => ({
            ...q,
            options: shuffle(q.options)
        }));
        state.userAnswers = {};
        state.currentIndex = 0;
        state.accumulatedMs = 0;
        persistActiveQuiz();
    }

    document.getElementById('recovery-banner').style.display = 'none';
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
        const totalSec = Math.floor(state.accumulatedMs / 1000);

        let hits = 0, errors = 0, unanswered = 0;
        state.questions.forEach(q => {
            const ans = state.userAnswers[q.id];
            if (!ans) unanswered++;
            else if (ans === q.correctOption) hits++;
            else errors++;
        });

        const attempt = {
            id: 'att_' + Date.now(),
            date: new Date().toISOString(),
            candidateAlias: state.alias.trim() || 'Aspirante',
            totalQuestions: total,
            hits, errors, unanswered,
            scorePct: (hits / total) * 100,
            totalTimeSeconds: totalSec,
            questionsSnapshot: state.questions,
            userAnswersSnapshot: state.userAnswers
        };

        Storage.saveAttempt(attempt);
        renderResults(attempt);
    };

    if (pending > 0) {
        showModal("Preguntas Pendientes", `Tienes ${pending} pregunta(s) sin responder de ${total}. ¿Deseas finalizar de todos modos?`, processFinish);
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
    document.getElementById('available-info').textContent = `Disponibles actualmente: ${QUESTION_BANK.length} preguntas oficiales con respuesta verificada.`;

    aliasInput.addEventListener('input', e => {
        state.alias = e.target.value;
        Storage.setAlias(state.alias);
        document.getElementById('display-alias').textContent = state.alias.trim() || 'Aspirante';
    });

    const activeQuiz = Storage.getActiveQuiz();
    if (activeQuiz && activeQuiz.questions?.length) {
        document.getElementById('recovery-info').textContent = `Hay un examen de ${activeQuiz.questions.length} preguntas en curso (${Object.keys(activeQuiz.userAnswers || {}).length} respondidas).`;
        document.getElementById('recovery-banner').style.display = 'flex';
    }

    document.getElementById('btn-start-quiz').addEventListener('click', () => startQuiz());
    document.getElementById('btn-resume-quiz').addEventListener('click', () => startQuiz(Storage.getActiveQuiz()));
    document.getElementById('btn-discard-quiz').addEventListener('click', () => {
        showModal("Descartar Examen", "¿Deseas borrar el cuestionario interrumpido?", () => {
            Storage.clearActiveQuiz();
            document.getElementById('recovery-banner').style.display = 'none';
        });
    });

    document.getElementById('btn-prev-q').addEventListener('click', () => {
        if (state.currentIndex > 0) { state.currentIndex--; renderQuestion(); }
    });

    document.getElementById('btn-next-q').addEventListener('click', () => {
        if (state.currentIndex < state.questions.length - 1) { state.currentIndex++; renderQuestion(); }
        else finishQuiz();
    });

    document.getElementById('btn-finish-quiz').addEventListener('click', finishQuiz);
    document.getElementById('btn-restart-from-res').addEventListener('click', () => switchScreen('home'));
    document.getElementById('btn-home-from-res').addEventListener('click', () => { switchScreen('home'); renderLastAttempt(); });
    document.getElementById('btn-view-history').addEventListener('click', renderHistoryScreen);
    document.getElementById('btn-back-home-history').addEventListener('click', () => { switchScreen('home'); renderLastAttempt(); });
    document.getElementById('btn-clear-history').addEventListener('click', () => {
        showModal("Borrar Memoria Local", "¿Deseas borrar todo el historial de exámenes?", () => {
            Storage.clearHistory();
            renderLastAttempt();
        });
    });

    renderLastAttempt();
});
