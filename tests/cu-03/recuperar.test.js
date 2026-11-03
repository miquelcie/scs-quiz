import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../../js/storage.js';
import { buildActiveQuizSnapshot } from '../../js/engine.js';
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

    test('descartar elimina el examen activo', () => {
        Storage.setActiveQuiz({ questions: makeBank(), userAnswers: {}, currentIndex: 0, accumulatedMs: 0 });
        Storage.clearActiveQuiz();

        assert.equal(Storage.getActiveQuiz(), null);
    });
});
