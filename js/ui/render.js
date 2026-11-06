// Pintado de las vistas: pregunta, resultados, último intento e historial paginado.

import {
    HISTORY_PAGE_SIZE,
    escapeHTML,
    formatDate,
    formatPct,
    formatTime,
    paginate,
    pluralize,
    toggleAnswer
} from '../engine.js';
import { Storage } from '../storage.js';
import { IDS, SCREENS, byId, optionPrefix } from '../dom.js';
import { state } from '../state.js';
import { showModal, showStorageError, switchScreen } from './modal.js';

let historyPage = 1;
let historyActionsBound = false;

// Callback que el flujo registra para persistir cada respuesta.
let answerChangeHandler = () => {};

export const setAnswerChangeHandler = handler => {
    answerChangeHandler = typeof handler === 'function' ? handler : () => {};
};

export const renderQuestion = (focusOptionIndex = null) => {
    const question = state.questions[state.currentIndex];
    const total = state.questions.length;
    const progress = Math.round(((state.currentIndex + 1) / total) * 100);

    byId(IDS.Q_CURRENT).textContent = state.currentIndex + 1;
    byId(IDS.Q_TOTAL).textContent = total;
    byId(IDS.Q_FOLIO).textContent = state.currentIndex + 1;
    byId(IDS.PROGRESS_BAR_FILL).style.width = `${progress}%`;
    byId(IDS.PROGRESS_BAR_BG).setAttribute('aria-valuenow', progress);
    byId(IDS.QUESTION_STATEMENT).textContent = question.statement;

    const container = byId(IDS.OPTIONS_CONTAINER);
    const fragment = document.createDocumentFragment();

    question.options.forEach((option, index) => {
        const isSelected = state.userAnswers[question.id] === option.id;
        const item = document.createElement('div');
        item.className = `option-item ${isSelected ? 'selected' : ''}`;
        item.tabIndex = 0;
        item.setAttribute('role', 'radio');
        item.setAttribute('aria-checked', String(isSelected));
        item.innerHTML = `
            <div class="option-prefix">${optionPrefix(index)}</div>
            <div class="option-text">${escapeHTML(option.text)}</div>
        `;

        const selectAnswer = () => {
            toggleAnswer(state.userAnswers, question.id, option.id);
            answerChangeHandler();
        };

        item.addEventListener('click', () => {
            selectAnswer();
            renderQuestion(index);
        });

        item.addEventListener('keydown', event => {
            const optionCount = question.options.length;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectAnswer();
                renderQuestion(index);
                return;
            }

            let target = null;
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                target = (index + 1) % optionCount;
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                target = (index - 1 + optionCount) % optionCount;
            } else if (event.key === 'Home') {
                target = 0;
            } else if (event.key === 'End') {
                target = optionCount - 1;
            }

            if (target !== null) {
                event.preventDefault();
                container.children[target]?.focus({ preventScroll: true });
            }
        });

        fragment.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    if (focusOptionIndex !== null) {
        container.children[focusOptionIndex]?.focus();
    }

    byId(IDS.BTN_PREV_Q).disabled = state.currentIndex === 0;

    // En la última pregunta solo queda un control de finalización visible.
    // Si el botón de la barra tiene el foco, se traslada antes de ocultarlo.
    const isLast = state.currentIndex === total - 1;
    const finishBtn = byId(IDS.BTN_FINISH_QUIZ);
    const nextBtn = byId(IDS.BTN_NEXT_Q);
    if (isLast && document.activeElement === finishBtn) {
        nextBtn.focus({ preventScroll: true });
    }
    finishBtn.hidden = isLast;
    nextBtn.textContent = isLast ? 'Finalizar test' : 'Siguiente';
};

export const renderResults = attempt => {
    byId(IDS.RESULTS_CANDIDATE).textContent = `Aspirante: ${String(attempt.candidateAlias ?? 'Aspirante')}. ${formatDate(attempt.date)}`;
    byId(IDS.RES_SCORE_PCT).textContent = formatPct(Number(attempt.scorePct));
    byId(IDS.RES_HITS).textContent = Number(attempt.hits);
    byId(IDS.RES_ERRORS).textContent = Number(attempt.errors);
    byId(IDS.RES_BLANK).textContent = Number(attempt.unanswered);
    byId(IDS.RES_TIME_TOTAL).textContent = formatTime(Number(attempt.totalTimeSeconds));

    const container = byId(IDS.REVIEW_CONTAINER);
    const fragment = document.createDocumentFragment();

    attempt.questionsSnapshot.forEach((question, index) => {
        const userChoice = attempt.userAnswersSnapshot[question.id];
        const isCorrect = userChoice === question.correctOption;
        const isBlank = !userChoice;

        const badge = isCorrect ? '<span class="status-badge badge-correct">Correcta</span>' :
            isBlank ? '<span class="status-badge badge-unanswered">Sin responder</span>' :
                '<span class="status-badge badge-incorrect">Incorrecta</span>';
        const statusClass = isCorrect ? 'status-correct' : isBlank ? 'status-unanswered' : 'status-incorrect';

        const item = document.createElement('div');
        item.className = `review-item ${statusClass}`;

        let optionsHTML = '';
        question.options.forEach((option, optionIndex) => {
            const isRight = question.correctOption === option.id;
            const isUser = userChoice === option.id;
            const style = isRight ? 'is-correct' : (isUser ? 'is-user' : '');
            const tag = isRight ? 'Respuesta correcta' : (isUser ? 'Tu respuesta' : '');

            optionsHTML += `
                <div class="review-option ${style}">
                    <span><strong>${optionPrefix(optionIndex)}:</strong> ${escapeHTML(option.text)}</span>
                    <span class="option-tag">${tag}</span>
                </div>`;
        });

        item.innerHTML = `
            <div>${badge}</div>
            <p class="review-statement">${index + 1}. ${escapeHTML(question.statement)}</p>
            <div>${optionsHTML}</div>
            ${question.explanation ? `<div class="explanation-box"><strong>Explicación:</strong> ${escapeHTML(question.explanation)}</div>` : ''}
        `;
        fragment.appendChild(item);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
    switchScreen(SCREENS.RESULTS);
};

export const renderLastAttempt = () => {
    const history = Storage.getHistory();
    const container = byId(IDS.LAST_ATTEMPT_CONTENT);
    if (!history.length) {
        container.innerHTML = `<p class="empty-state">Todavía no has completado ningún simulacro. Cuando termines el primero, aquí verás tu nota.</p>`;
        return;
    }
    const last = history[0];
    container.innerHTML = `
        <div class="last-score">
            <span class="last-score-value">${formatPct(Number(last.scorePct))}</span>
            <span class="last-score-detail">${Number(last.hits)} de ${Number(last.totalQuestions)} aciertos</span>
        </div>
        <dl class="last-meta">
            <div><dt>Fecha</dt><dd>${escapeHTML(formatDate(last.date))}</dd></div>
            <div><dt>Tiempo</dt><dd>${formatTime(Number(last.totalTimeSeconds))}</dd></div>
        </dl>
        <button id="btn-view-last" class="btn btn-secondary btn-sm w-full">Revisar intento</button>`;
    byId(IDS.BTN_VIEW_LAST).addEventListener('click', () => renderResults(last));
};

// Vuelve a la portada con la tarjeta «Último resultado» ya actualizada.
// El render va antes del cambio de pantalla para que el foco caiga sobre contenido vigente.
export const returnHome = () => {
    renderLastAttempt();
    switchScreen(SCREENS.HOME);
};

const buildHistoryCard = item => {
    const safeId = escapeHTML(String(item.id));
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
        <div class="history-main">
            <div class="history-title">Examen de ${Number(item.totalQuestions)} preguntas</div>
            <div class="history-meta">
                <span>${escapeHTML(String(item.candidateAlias))}</span>
                <span>${escapeHTML(formatDate(item.date))}</span>
            </div>
            <div class="history-stats">
                <span><strong>${Number(item.hits)}</strong> aciertos</span>
                <span><strong>${Number(item.errors)}</strong> errores</span>
                <span><strong>${Number(item.unanswered)}</strong> sin responder</span>
            </div>
        </div>
        <div class="history-side">
            <div class="history-result">
                <div class="history-score">${formatPct(Number(item.scorePct))}</div>
                <div class="history-time">${formatTime(Number(item.totalTimeSeconds))}</div>
            </div>
            <div class="history-actions">
                <button class="btn btn-secondary btn-sm btn-view" data-id="${safeId}">Ver</button>
                <button class="btn btn-danger btn-sm btn-del" data-id="${safeId}" aria-label="Eliminar este intento">Eliminar</button>
            </div>
        </div>`;
    return card;
};

const buildHistoryFooter = () => {
    const footer = document.createElement('div');
    footer.className = 'history-footer';
    footer.innerHTML = `
        <p id="history-count" class="history-count" aria-live="polite"></p>
        <button id="btn-load-more-history" class="btn btn-secondary w-full" type="button"></button>`;
    return footer;
};

const updateHistoryFooter = history => {
    const total = history.length;
    const visible = Math.min(historyPage * HISTORY_PAGE_SIZE, total);
    const remaining = Math.max(0, total - visible);

    const count = byId(IDS.HISTORY_COUNT);
    if (count) count.textContent = `Mostrando ${visible} de ${total} ${total === 1 ? 'intento' : 'intentos'}`;

    const more = byId(IDS.BTN_LOAD_MORE_HISTORY);
    if (more) {
        more.hidden = remaining === 0;
        more.textContent = `Cargar más (${pluralize(remaining, 'restante', 'restantes')})`;
    }
};

// Añade la siguiente página sin volver a pintar las tarjetas ya visibles.
const loadMoreHistory = () => {
    const history = Storage.getHistory();
    const result = paginate(history, historyPage + 1, HISTORY_PAGE_SIZE);
    const list = document.querySelector('.history-list');
    if (!list) return;

    if (result.items.length) {
        historyPage = result.page;
        const fragment = document.createDocumentFragment();
        result.items.forEach(item => fragment.appendChild(buildHistoryCard(item)));
        list.appendChild(fragment);
    }
    updateHistoryFooter(history);
};

// Delegación de eventos: cubre también las páginas añadidas dinámicamente.
const bindHistoryActions = container => {
    if (historyActionsBound) return;
    historyActionsBound = true;

    container.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const more = target.closest('#btn-load-more-history');
        if (more) {
            loadMoreHistory();
            return;
        }

        const view = target.closest('.btn-view');
        if (view) {
            const found = Storage.getHistory().find(item => item.id === view.dataset.id);
            if (found) renderResults(found);
            return;
        }

        const remove = target.closest('.btn-del');
        if (remove) {
            const id = remove.dataset.id;
            showModal('Eliminar intento', '¿Deseas eliminar este registro?', () => {
                if (!Storage.deleteAttempt(id)) {
                    showStorageError(
                        'No se pudo borrar',
                        'No se pudo eliminar el intento. El historial guardado no se ha modificado.'
                    );
                    return;
                }
                renderHistoryScreen();
                renderLastAttempt();
            });
        }
    });
};

export const renderHistoryScreen = () => {
    historyPage = 1;
    const history = Storage.getHistory();
    const container = byId(IDS.HISTORY_LIST);
    bindHistoryActions(container);

    if (!history.length) {
        container.innerHTML = `<p class="empty-state is-centered">Todavía no hay intentos guardados. Completa un simulacro y aparecerá aquí.</p>`;
        switchScreen(SCREENS.HISTORY);
        return;
    }

    const page = paginate(history, 1, HISTORY_PAGE_SIZE);
    const list = document.createElement('div');
    list.className = 'history-list';
    page.items.forEach(item => list.appendChild(buildHistoryCard(item)));

    container.innerHTML = '';
    container.appendChild(list);
    container.appendChild(buildHistoryFooter());
    updateHistoryFooter(history);
    switchScreen(SCREENS.HISTORY);
};
