const KEYS = { ALIAS: 'scs_alias', HISTORY: 'scs_history', ACTIVE: 'scs_active' };

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
    getActiveQuiz: () => JSON.parse(localStorage.getItem(KEYS.ACTIVE) || 'null'),
    setActiveQuiz: (data) => localStorage.setItem(KEYS.ACTIVE, JSON.stringify(data)),
    clearActiveQuiz: () => localStorage.removeItem(KEYS.ACTIVE)
};
