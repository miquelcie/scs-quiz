import { normalizeActiveQuiz, normalizeHistory } from './engine.js';

const KEYS = { ALIAS: 'scs_alias', HISTORY: 'scs_history', ACTIVE: 'scs_active' };

/**
 * Máximo de intentos que se conservan cuando el guardado rota el historial.
 * @type {number}
 */
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
    /**
     * Lee el alias guardado.
     * @returns {string} Alias persistido o cadena vacía.
     */
    getAlias: () => {
        try {
            return localStorage.getItem(KEYS.ALIAS) || '';
        } catch {
            warnOnce(KEYS.ALIAS, 'lectura bloqueada');
            return '';
        }
    },
    /**
     * Guarda el alias.
     * @param {unknown} alias Alias a persistir.
     * @returns {boolean} `true` si la escritura se completó.
     */
    setAlias: (alias) => {
        try {
            localStorage.setItem(KEYS.ALIAS, String(alias ?? '').trim());
            return true;
        } catch {
            warnOnce(KEYS.ALIAS, 'escritura fallida');
            return false;
        }
    },

    /**
     * Lee y normaliza el historial de intentos.
     * @returns {Array<object>} Intentos representables, del más reciente al más antiguo.
     */
    getHistory: () => {
        const raw = readJSON(KEYS.HISTORY, []);
        if (!Array.isArray(raw)) {
            warnOnce(KEYS.HISTORY, 'el historial no es un array');
            return [];
        }
        return normalizeHistory(raw);
    },
    /**
     * Lee el historial crudo sin filtrar entradas inválidas ni reescribirlo.
     * @returns {unknown[]} Array crudo (vacío si no es un array).
     */
    readRawHistory: () => {
        const raw = readJSON(KEYS.HISTORY, []);
        return Array.isArray(raw) ? raw : [];
    },
    /**
     * Devuelve la longitud del historial crudo, incluidas las entradas inválidas.
     * @returns {number} Número de entradas; nunca lanza.
     */
    getHistoryLength: () => Storage.readRawHistory().length,
    /**
     * Añade un intento al principio del historial.
     * @param {object} attempt Intento a guardar.
     * @param {{rotate?: boolean}} [options] `rotate` elimina la entrada más antigua representable si se supera `HISTORY_LIMIT`.
     * @returns {boolean} `true` si la escritura se completó.
     */
    saveAttempt: (attempt, { rotate = false } = {}) => {
        const history = Storage.readRawHistory();
        history.unshift(attempt);

        // La rotación elimina la última entrada representable anterior al intento nuevo;
        // las inválidas se conservan para no reescribir el crudo (decisión de 004).
        // El índice 0 nunca se elimina: es el intento que se acaba de guardar.
        if (rotate && history.length > HISTORY_LIMIT) {
            for (let i = history.length - 1; i >= 1; i--) {
                if (history[i] !== null && typeof history[i] === 'object') {
                    history.splice(i, 1);
                    break;
                }
            }
        }

        return writeJSON(KEYS.HISTORY, history);
    },
    /**
     * Elimina el intento indicado conservando las entradas inválidas del crudo.
     * @param {string} id Identificador del intento.
     * @returns {boolean} `true` si la escritura se completó.
     */
    deleteAttempt: (id) => {
        const history = Storage.readRawHistory().filter(item => !item || item.id !== id);
        return writeJSON(KEYS.HISTORY, history);
    },
    /**
     * Borra por completo el historial de intentos.
     * @returns {boolean} `true` si el borrado se completó.
     */
    clearHistory: () => removeKey(KEYS.HISTORY, 'no se pudo borrar el historial'),

    /**
     * Lee y normaliza el examen en curso.
     * @returns {{questions: Array<object>, userAnswers: Record<string, string>, currentIndex: number, accumulatedMs: number}|null} Instantánea válida o `null`.
     */
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
    /**
     * Guarda la instantánea del examen en curso.
     * @param {object} data Instantánea a persistir.
     * @returns {boolean} `true` si la escritura se completó.
     */
    setActiveQuiz: (data) => writeJSON(KEYS.ACTIVE, data),
    /**
     * Borra la instantánea del examen en curso.
     * @returns {boolean} `true` si el borrado se completó.
     */
    clearActiveQuiz: () => removeKey(KEYS.ACTIVE, 'no se pudo borrar el examen activo')
};
