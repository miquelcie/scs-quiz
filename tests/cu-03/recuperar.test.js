import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../../js/storage.js';
import {
    buildActiveQuizSnapshot,
    isNonEmptyString,
    isPlainObject,
    isValidQuestion,
    moveIndex,
    normalizeActiveQuiz,
    sanitizeAnswers
} from '../../js/engine.js';
import { makeBank } from '../helpers/fixtures.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
});

const activeSnapshot = (overrides = {}) => ({
    questions: makeBank(),
    userAnswers: { 'T-001': 'B' },
    currentIndex: 2,
    accumulatedMs: 65000,
    ...overrides
});

describe('CU-03 — Recuperar examen interrumpido', () => {
    test('sin examen guardado devuelve null', () => {
        assert.equal(Storage.getActiveQuiz(), null);
    });

    test('las lecturas inválidas de scs_active avisan una sola vez por clave', () => {
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args.join(' '));

        try {
            const invalidValues = [
                '{',
                'null',
                '"texto"',
                '{}',
                JSON.stringify({ questions: [] }),
                JSON.stringify({ questions: makeBank(), userAnswers: [], currentIndex: 0 }),
                JSON.stringify({ questions: makeBank(), userAnswers: {}, currentIndex: '2' })
            ];

            invalidValues.forEach(raw => {
                localStorage.setItem('scs_active', raw);
                assert.equal(Storage.getActiveQuiz(), null);
            });
        } finally {
            console.warn = originalWarn;
        }

        assert.equal(warnings.length, 1);
    });

    test('guarda y recupera el examen completo', () => {
        const snapshot = activeSnapshot();

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
        Storage.setActiveQuiz(activeSnapshot({
            userAnswers: { 'T-001': 'B' },
            currentIndex: 3
        }));

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

        assert.equal(recovered.currentIndex, questions.length - 1);
        assert.equal(resolvedIndex, questions.length - 1);
    });

    test('descartar elimina el examen activo', () => {
        Storage.setActiveQuiz(activeSnapshot());
        Storage.clearActiveQuiz();

        assert.equal(Storage.getActiveQuiz(), null);
    });

    test('descartar y guardar deja el examen nuevo y no el anterior', () => {
        const previous = activeSnapshot({
            userAnswers: { 'T-001': 'B' },
            currentIndex: 1,
            accumulatedMs: 12000
        });
        const fresh = activeSnapshot({
            userAnswers: {},
            currentIndex: 0,
            accumulatedMs: 0
        });

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

describe('CU-03 — Validación de datos persistidos', () => {
    test('isPlainObject excluye null, arrays y primitivos', () => {
        assert.equal(isPlainObject({}), true);
        assert.equal(isPlainObject({ a: 1 }), true);
        assert.equal(isPlainObject(null), false);
        assert.equal(isPlainObject([]), false);
        assert.equal(isPlainObject('texto'), false);
        assert.equal(isPlainObject(3), false);
    });

    test('isNonEmptyString exige texto con contenido', () => {
        assert.equal(isNonEmptyString('A'), true);
        assert.equal(isNonEmptyString('  A  '), true);
        assert.equal(isNonEmptyString(''), false);
        assert.equal(isNonEmptyString('   '), false);
        assert.equal(isNonEmptyString(1), false);
        assert.equal(isNonEmptyString(null), false);
    });

    test('isValidQuestion rechaza preguntas incompletas o incoherentes', () => {
        const valid = makeBank()[0];

        assert.equal(isValidQuestion(valid), true);
        assert.equal(isValidQuestion(null), false);
        assert.equal(isValidQuestion({ ...valid, id: '' }), false);

        const noOptions = { ...valid, options: 'A,B' };
        assert.equal(isValidQuestion(noOptions), false);
        assert.equal(isValidQuestion({ ...valid, options: [] }), false);

        const noOptionId = { ...valid, options: [{ id: '', text: 'X' }] };
        assert.equal(isValidQuestion(noOptionId), false);

        const duplicated = {
            ...valid,
            options: [{ id: 'A', text: 'Uno' }, { id: 'A', text: 'Dos' }]
        };
        assert.equal(isValidQuestion(duplicated), false);

        const missingCorrect = { ...valid, correctOption: 'Z' };
        assert.equal(isValidQuestion(missingCorrect), false);
    });

    test('sanitizeAnswers descarta ids ajenos, valores vacíos y opciones inexistentes', () => {
        const questions = makeBank();
        const answers = {
            'T-001': 'A',
            'T-999': 'A',
            'T-002': 'Z',
            'T-003': '',
            'T-004': 5
        };

        assert.deepEqual(sanitizeAnswers(questions, answers), { 'T-001': 'A' });
    });

    test('normalizeActiveQuiz rechaza estructuras y tipos inválidos', () => {
        const questions = makeBank();

        const invalidValues = [
            null,
            [],
            {},
            { questions: [], userAnswers: {}, currentIndex: 0 },
            { questions: 'no', userAnswers: {}, currentIndex: 0 },
            { questions: [{ id: '', options: [] }], userAnswers: {}, currentIndex: 0 },
            { questions, userAnswers: null, currentIndex: 0 },
            { questions, userAnswers: [], currentIndex: 0 },
            { questions, userAnswers: {}, currentIndex: '2' },
            { questions, userAnswers: {}, currentIndex: 2.5 },
            { questions, userAnswers: {}, currentIndex: NaN }
        ];

        invalidValues.forEach(value => {
            assert.equal(normalizeActiveQuiz(value), null);
        });
    });

    test('normalizeActiveQuiz recorta el índice y normaliza el tiempo', () => {
        const questions = makeBank();
        const high = normalizeActiveQuiz({
            questions,
            userAnswers: {},
            currentIndex: 999,
            accumulatedMs: -5
        });
        const low = normalizeActiveQuiz({
            questions,
            userAnswers: {},
            currentIndex: -3,
            accumulatedMs: NaN
        });

        assert.equal(high.currentIndex, questions.length - 1);
        assert.equal(high.accumulatedMs, 0);
        assert.equal(low.currentIndex, 0);
        assert.equal(low.accumulatedMs, 0);
    });

    test('normalizeActiveQuiz conserva respuestas válidas y descarta el resto', () => {
        const normalized = normalizeActiveQuiz({
            questions: makeBank(),
            userAnswers: {
                'T-001': 'A',
                'T-999': 'A',
                'T-002': 'Z',
                'T-003': '',
                'T-004': 5
            },
            currentIndex: 1,
            accumulatedMs: 1000
        });

        assert.deepEqual(normalized.userAnswers, { 'T-001': 'A' });
        assert.equal(normalized.currentIndex, 1);
        assert.equal(normalized.accumulatedMs, 1000);
    });

    test('getActiveQuiz aplica las mismas reglas a datos guardados', () => {
        localStorage.setItem('scs_active', JSON.stringify({
            questions: makeBank(),
            userAnswers: {
                'T-001': 'A',
                'T-999': 'B',
                'T-002': 'Z'
            },
            currentIndex: 999,
            accumulatedMs: -10
        }));

        const recovered = Storage.getActiveQuiz();

        assert.deepEqual(recovered.userAnswers, { 'T-001': 'A' });
        assert.equal(recovered.currentIndex, recovered.questions.length - 1);
        assert.equal(recovered.accumulatedMs, 0);
    });
});
