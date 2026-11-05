import { normalizeActiveQuiz, normalizeHistory } from './engine.js';

const KEYS = { ALIAS: 'scs_alias', HISTORY: 'scs_history', ACTIVE: 'scs_active' };

// Máximo de intentos que se conservan cuando el guardado rota el historial.
export const HISTORY_LIMIT = 50;

// Un aviso por clave y sesión: evita inundar la consola sin ocultar el fallo.
const warnedKeys = new Set();

const warnOnce = (key, reason) => {
    if (warnedKeys.has(key)) return;
    warnedKeys.add(key);
    console.warn(`[Storage] ${key}: ${reason}`);
};

const readJSON = (key, fallback) => {
    let text;
    try {
        text = localStorage.getItem(key);
    } catch {
        warnOnce(key, 'lectura bloqueada');
        return fallback;
    }

    if (text === null) return fallback;

    try {
        return JSON.parse(text);
    } catch {
        warnOnce(key, 'JSON inválido');
        return fallback;
    }
};

const writeJSON = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        warnOnce(key, 'escritura fallida');
        return false;
    }
};

const removeKey = (key, reason) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
        warnOnce(key, reason);
        return false;
    }
};

export const Storage = {
    getAlias: () => {
        try {
            return localStorage.getItem(KEYS.ALIAS) || '';
        } catch {
            warnOnce(KEYS.ALIAS, 'lectura bloqueada');
            return '';
        }
    },
    setAlias: (alias) => {
        try {
            localStorage.setItem(KEYS.ALIAS, String(alias ?? '').trim());
            return true;
        } catch {
            warnOnce(KEYS.ALIAS, 'escritura fallida');
            return false;
        }
    },

    getHistory: () => {
        const raw = readJSON(KEYS.HISTORY, []);
        if (!Array.isArray(raw)) {
            warnOnce(KEYS.HISTORY, 'el historial no es un array');
            return [];
        }
        return normalizeHistory(raw);
    },
    readRawHistory: () => {
        const raw = readJSON(KEYS.HISTORY, []);
        return Array.isArray(raw) ? raw : [];
    },
    // Longitud del historial crudo, incluidas las entradas inválidas; nunca lanza.
    getHistoryLength: () => Storage.readRawHistory().length,
    saveAttempt: (attempt, { rotate = false } = {}) => {
        const history = Storage.readRawHistory();
        history.unshift(attempt);

        // La rotación elimina la última entrada representable; las inválidas se conservan
        // para no reescribir el crudo (decisión de 004).
        if (rotate && history.length > HISTORY_LIMIT) {
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i] !== null && typeof history[i] === 'object') {
                    history.splice(i, 1);
                    break;
                }
            }
        }

        return writeJSON(KEYS.HISTORY, history);
    },
    deleteAttempt: (id) => {
        const history = Storage.readRawHistory().filter(item => !item || item.id !== id);
        return writeJSON(KEYS.HISTORY, history);
    },
    clearHistory: () => removeKey(KEYS.HISTORY, 'no se pudo borrar el historial'),

    getActiveQuiz: () => {
        const raw = readJSON(KEYS.ACTIVE, null);
        if (raw === null) return null;

        const normalized = normalizeActiveQuiz(raw);
        if (normalized === null) {
            warnOnce(KEYS.ACTIVE, 'forma inválida');
            return null;
        }
        return normalized;
    },
    setActiveQuiz: (data) => writeJSON(KEYS.ACTIVE, data),
    clearActiveQuiz: () => removeKey(KEYS.ACTIVE, 'no se pudo borrar el examen activo')
};
