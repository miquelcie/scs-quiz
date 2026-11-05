const KEYS = { ALIAS: 'scs_alias', HISTORY: 'scs_history', ACTIVE: 'scs_active' };

// Lectura defensiva mínima para decidir si hay un examen recuperable.
// La normalización completa de datos persistidos corresponde al plan 004.
const readActiveQuiz = () => {
    let data;
    try {
        data = JSON.parse(localStorage.getItem(KEYS.ACTIVE) || 'null');
    } catch {
        return null;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (!Array.isArray(data.questions) || data.questions.length === 0) return null;
    if (!data.userAnswers || typeof data.userAnswers !== 'object' || Array.isArray(data.userAnswers)) return null;
    if (!Number.isInteger(data.currentIndex)) return null;
    return data;
};

export const Storage = {
    getAlias: () => localStorage.getItem(KEYS.ALIAS) || '',
    setAlias: (alias) => localStorage.setItem(KEYS.ALIAS, alias.trim()),
    getHistory: () => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),
    saveAttempt: (attempt) => {
        const h = Storage.getHistory();
        h.unshift(attempt);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(h));
    },
    deleteAttempt: (id) => {
        const h = Storage.getHistory().filter(i => i.id !== id);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(h));
    },
    clearHistory: () => localStorage.removeItem(KEYS.HISTORY),
    getActiveQuiz: () => readActiveQuiz(),
    setActiveQuiz: (data) => localStorage.setItem(KEYS.ACTIVE, JSON.stringify(data)),
    clearActiveQuiz: () => localStorage.removeItem(KEYS.ACTIVE)
};
