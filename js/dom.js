// Constantes de pantallas, identificadores y prefijos de opción.
// Módulo hoja: no importa ningún otro módulo del proyecto.

export const SCREENS = Object.freeze({
    HOME: 'home',
    QUIZ: 'quiz',
    RESULTS: 'results',
    HISTORY: 'history'
});

export const IDS = Object.freeze({
    // Portada y alias
    DISPLAY_ALIAS: 'display-alias',
    ALIAS_INPUT: 'input-alias',
    AVAILABLE_INFO: 'available-info',
    HERO_BANK: 'hero-bank',

    // Recuperación del examen en curso
    RECOVERY_BANNER: 'recovery-banner',
    RECOVERY_INFO: 'recovery-info',
    BTN_START_QUIZ: 'btn-start-quiz',
    BTN_RESUME_QUIZ: 'btn-resume-quiz',
    BTN_DISCARD_QUIZ: 'btn-discard-quiz',

    // Cuestionario
    NUM_QUESTIONS: 'num-questions-select',
    QUIZ_TIMER: 'quiz-timer',
    Q_CURRENT: 'q-current',
    Q_TOTAL: 'q-total',
    Q_FOLIO: 'q-folio',
    PROGRESS_BAR_BG: 'progress-bar-bg',
    PROGRESS_BAR_FILL: 'progress-bar-fill',
    QUESTION_STATEMENT: 'question-statement',
    OPTIONS_CONTAINER: 'options-container',
    BTN_PREV_Q: 'btn-prev-q',
    BTN_NEXT_Q: 'btn-next-q',
    BTN_FINISH_QUIZ: 'btn-finish-quiz',

    // Resultados
    RESULTS_CANDIDATE: 'results-candidate',
    RES_SCORE_PCT: 'res-score-pct',
    RES_HITS: 'res-hits',
    RES_ERRORS: 'res-errors',
    RES_BLANK: 'res-blank',
    RES_TIME_TOTAL: 'res-time-total',
    REVIEW_CONTAINER: 'review-container',
    BTN_RESTART_FROM_RES: 'btn-restart-from-res',
    BTN_HOME_FROM_RES: 'btn-home-from-res',
    BTN_PRINT_RESULTS: 'btn-print-results',

    // Último intento
    LAST_ATTEMPT_CONTENT: 'last-attempt-content',
    BTN_VIEW_LAST: 'btn-view-last',

    // Historial
    HISTORY_LIST: 'history-list-container',
    HISTORY_COUNT: 'history-count',
    BTN_LOAD_MORE_HISTORY: 'btn-load-more-history',
    BTN_VIEW_HISTORY: 'btn-view-history',
    BTN_CLEAR_HISTORY: 'btn-clear-history',
    BTN_BACK_HOME_HISTORY: 'btn-back-home-history',

    // Modal
    CUSTOM_MODAL: 'custom-modal',
    MODAL_TITLE: 'modal-title',
    MODAL_MSG: 'modal-msg',
    MODAL_CANCEL: 'modal-cancel',
    MODAL_CONFIRM: 'modal-confirm'
});

export const BACKGROUND_REGIONS = ['header', 'main', 'footer'];

export const OPTION_PREFIXES = ['A', 'B', 'C', 'D', 'E'];

// Prefijo visible de una opción; para índices fuera de la lista usa el número.
export const optionPrefix = index =>
    OPTION_PREFIXES[index] || String(index + 1);

export const byId = id => document.getElementById(id);

export const screenId = screen => `screen-${screen}`;
