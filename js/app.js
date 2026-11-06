// Arranque de la aplicación: carga inicial y registro de listeners estáticos.
// La lógica vive en flow/, el pintado en ui/, el estado en state.js.

import { QUESTION_BANK } from './questions.js';
import { Storage } from './storage.js';
import { formatRecoveryInfo, isQuizInProgress, sanitizeAlias } from './engine.js';
import { IDS, byId } from './dom.js';
import { state } from './state.js';
import { showModal, showStorageError } from './ui/modal.js';
import {
    renderHistoryScreen,
    renderLastAttempt,
    returnHome,
    setAnswerChangeHandler
} from './ui/render.js';
import {
    finishQuiz,
    handleStartQuiz,
    navigate,
    persistActiveQuiz,
    startQuiz
} from './flow/quiz.js';

document.addEventListener('DOMContentLoaded', () => {
    const aliasInput = byId(IDS.ALIAS_INPUT);
    const savedAlias = Storage.getAlias();
    state.alias = sanitizeAlias(savedAlias);
    aliasInput.value = state.alias;
    byId(IDS.DISPLAY_ALIAS).textContent = state.alias || 'Aspirante';
    if (state.alias !== savedAlias) {
        Storage.setAlias(state.alias);
    }

    byId(IDS.AVAILABLE_INFO).textContent = `${QUESTION_BANK.length} preguntas disponibles con respuesta verificada.`;
    byId(IDS.HERO_BANK).textContent = `${QUESTION_BANK.length} preguntas verificadas`;

    aliasInput.addEventListener('input', () => {
        const rawAlias = aliasInput.value;
        const cleanAlias = sanitizeAlias(rawAlias);

        if (rawAlias !== cleanAlias) {
            // Conserva el cursor en la posición equivalente tras eliminar caracteres.
            const caret = aliasInput.selectionStart ?? rawAlias.length;
            const cleanPrefix = sanitizeAlias(rawAlias.slice(0, caret));
            aliasInput.value = cleanAlias;
            aliasInput.setSelectionRange(cleanPrefix.length, cleanPrefix.length);
        }

        state.alias = cleanAlias;
        Storage.setAlias(cleanAlias);
        byId(IDS.DISPLAY_ALIAS).textContent = cleanAlias || 'Aspirante';
    });

    const activeQuiz = Storage.getActiveQuiz();
    if (activeQuiz && activeQuiz.questions?.length) {
        byId(IDS.RECOVERY_INFO).textContent = formatRecoveryInfo(
            activeQuiz.questions,
            activeQuiz.userAnswers
        );
        byId(IDS.RECOVERY_BANNER).hidden = false;
    }

    // El pintado de preguntas avisa al flujo para persistir cada respuesta.
    setAnswerChangeHandler(persistActiveQuiz);

    byId(IDS.BTN_START_QUIZ).addEventListener('click', () => handleStartQuiz(QUESTION_BANK));
    byId(IDS.BTN_RESUME_QUIZ).addEventListener('click', () => {
        startQuiz(Storage.getActiveQuiz(), QUESTION_BANK);
    });
    byId(IDS.BTN_DISCARD_QUIZ).addEventListener('click', () => {
        showModal('Descartar examen', '¿Deseas borrar el cuestionario interrumpido?', () => {
            Storage.clearActiveQuiz();
            byId(IDS.RECOVERY_BANNER).hidden = true;
            // Destino de foco tras confirmar (R10): la acción principal de la portada.
            byId(IDS.BTN_START_QUIZ).focus({ preventScroll: true });
        });
    });

    byId(IDS.BTN_PREV_Q).addEventListener('click', () => navigate(-1));
    byId(IDS.BTN_NEXT_Q).addEventListener('click', () => {
        if (state.currentIndex < state.questions.length - 1) navigate(1);
        else finishQuiz();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) persistActiveQuiz();
    });
    window.addEventListener('pagehide', persistActiveQuiz);

    window.addEventListener('beforeunload', event => {
        if (!isQuizInProgress(state.questions, state.currentIndex)) return;
        event.preventDefault();
        event.returnValue = '';
    });

    byId(IDS.BTN_FINISH_QUIZ).addEventListener('click', finishQuiz);
    byId(IDS.BTN_RESTART_FROM_RES).addEventListener('click', returnHome);
    byId(IDS.BTN_HOME_FROM_RES).addEventListener('click', returnHome);
    byId(IDS.BTN_PRINT_RESULTS).addEventListener('click', () => window.print());
    byId(IDS.BTN_VIEW_HISTORY).addEventListener('click', renderHistoryScreen);
    byId(IDS.BTN_BACK_HOME_HISTORY).addEventListener('click', returnHome);
    byId(IDS.BTN_CLEAR_HISTORY).addEventListener('click', () => {
        showModal('Borrar historial local', '¿Deseas borrar todo el historial de exámenes?', () => {
            if (!Storage.clearHistory()) {
                showStorageError(
                    'No se pudo borrar',
                    'No se pudo borrar el historial guardado. Los intentos siguen en este navegador.'
                );
                return;
            }
            renderLastAttempt();
            // Destino de foco tras confirmar (R10): el botón que originó la acción.
            byId(IDS.BTN_CLEAR_HISTORY).focus({ preventScroll: true });
        });
    });

    renderLastAttempt();
});
