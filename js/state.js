// Única fuente de verdad del estado mutable del examen.
// Ningún otro módulo declara estado global propio.

export const state = {
    alias: '',
    questions: [],
    userAnswers: {},
    currentIndex: 0,
    accumulatedMs: 0,
    startTimestamp: 0,
    timerInterval: null
};
