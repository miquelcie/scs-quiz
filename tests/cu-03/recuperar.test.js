import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../../js/storage.js';
import { buildActiveQuizSnapshot, moveIndex } from '../../js/engine.js';
import { makeBank } from '../helpers/fixtures.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
});

describe('CU-03 — Recuperar examen interrumpido', () => {
    test('sin examen guardado devuelve null', () => {
        assert.equal(Storage.getActiveQuiz(), null);
    });

    test('guarda y recupera el examen completo', () => {
        const snapshot = {
            questions: makeBank(),
            userAnswers: { 'T-001': 'B', 'T-002': 'C' },
            currentIndex: 2,
            accumulatedMs: 65000
        };

        Storage.setActiveQuiz(snapshot);

        assert.deepEqual(Storage.getActiveQuiz(), snapshot);
    });

    test('el snapshot incluye la pregunta actual', () => {
        const snapshot = buildActiveQuizSnapshot({
            questions: makeBank(),
            userAnswers: {},
            currentIndex: 3,
            accumulatedMs: 0
        });

        Storage.setActiveQuiz(snapshot);

        assert.equal(Storage.getActiveQuiz().currentIndex, 3);
    });

    test('recupera un snapshot con índice 3 y tiempo 65000', () => {
        const snapshot = buildActiveQuizSnapshot({
            questions: makeBank(),
            userAnswers: { 'T-001': 'B' },
            currentIndex: 3,
            accumulatedMs: 65000
        });

        Storage.setActiveQuiz(snapshot);
        const recovered = Storage.getActiveQuiz();

        assert.equal(recovered.currentIndex, 3);
        assert.equal(recovered.accumulatedMs, 65000);
        assert.deepEqual(recovered.userAnswers, { 'T-001': 'B' });
    });

    test('un índice guardado fuera de rango se recorta al recuperar', () => {
        const questions = makeBank();
        Storage.setActiveQuiz({
            questions,
            userAnswers: {},
            currentIndex: 999,
            accumulatedMs: 0
        });

        const recovered = Storage.getActiveQuiz();
        const resolvedIndex = moveIndex(recovered.currentIndex, recovered.questions.length, 0);

        assert.equal(resolvedIndex, questions.length - 1);
    });

    test('descartar elimina el examen activo', () => {
        Storage.setActiveQuiz({ questions: makeBank(), userAnswers: {}, currentIndex: 0, accumulatedMs: 0 });
        Storage.clearActiveQuiz();

        assert.equal(Storage.getActiveQuiz(), null);
    });

    test('descartar y guardar deja el examen nuevo y no el anterior', () => {
        const previous = {
            questions: makeBank(),
            userAnswers: { 'T-001': 'B' },
            currentIndex: 1,
            accumulatedMs: 12000
        };
        const fresh = {
            questions: makeBank(),
            userAnswers: {},
            currentIndex: 0,
            accumulatedMs: 0
        };

        Storage.setActiveQuiz(previous);
        Storage.clearActiveQuiz();
        Storage.setActiveQuiz(fresh);

        assert.deepEqual(Storage.getActiveQuiz(), fresh);
    });

    test('un scs_active con JSON inválido se lee como null', () => {
        localStorage.setItem('scs_active', '{');

        assert.equal(Storage.getActiveQuiz(), null);
    });

    test('un scs_active con forma inválida se lee como null', () => {
        localStorage.setItem('scs_active', JSON.stringify({ questions: [] }));

        assert.equal(Storage.getActiveQuiz(), null);
    });
});
