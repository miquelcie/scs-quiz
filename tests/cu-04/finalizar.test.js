import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
    createAttempt,
    formatDate,
    formatPct,
    formatTime,
    scoreQuiz
} from '../../js/engine.js';
import { Storage } from '../../js/storage.js';
import { makeBank } from '../helpers/fixtures.js';
import { createFailingStorage } from '../helpers/failing-storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
});

afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
});

const storedAttempt = (now = 1) => createAttempt({
    questions: makeBank(),
    userAnswers: { 'T-001': 'A' },
    alias: 'Ana',
    totalTimeSeconds: 10,
    now,
    date: new Date('2026-11-03T10:00:00.000Z')
});

describe('CU-04 — Finalizar y corregir', () => {
    test('todo correcto da 100 %', () => {
        const result = scoreQuiz(makeBank(), {
            'T-001': 'A',
            'T-002': 'B',
            'T-003': 'C',
            'T-004': 'D'
        });

        assert.deepEqual(result, { hits: 4, errors: 0, unanswered: 0, scorePct: 100 });
    });

    test('cuenta aciertos, errores y preguntas en blanco', () => {
        const result = scoreQuiz(makeBank(), {
            'T-001': 'A',
            'T-002': 'C',
            'T-004': 'D'
        });

        assert.deepEqual(result, { hits: 2, errors: 1, unanswered: 1, scorePct: 50 });
    });

    test('sin respuestas todo queda en blanco', () => {
        const result = scoreQuiz(makeBank(), {});

        assert.deepEqual(result, { hits: 0, errors: 0, unanswered: 4, scorePct: 0 });
    });

    test('formatea el porcentaje con coma decimal', () => {
        assert.equal(formatPct(28), '28,00 %');
        assert.equal(formatPct(28.000000000000004), '28,00 %');
    });

    test('formatea el tiempo en mm:ss y hh:mm:ss', () => {
        assert.equal(formatTime(0), '00:00');
        assert.equal(formatTime(65), '01:05');
        assert.equal(formatTime(3661), '01:01:01');
    });

    test('crea el intento con identificador, fecha y snapshots', () => {
        const questions = makeBank();
        const userAnswers = { 'T-001': 'A' };
        const date = new Date('2026-11-03T10:00:00.000Z');

        const attempt = createAttempt({
            questions,
            userAnswers,
            alias: '  Ana  ',
            totalTimeSeconds: 90,
            now: 1700000000000,
            date
        });

        assert.equal(attempt.id, 'att_1700000000000');
        assert.equal(attempt.date, '2026-11-03T10:00:00.000Z');
        assert.equal(attempt.candidateAlias, 'Ana');
        assert.equal(attempt.totalQuestions, 4);
        assert.equal(attempt.totalTimeSeconds, 90);
        assert.equal(attempt.questionsSnapshot, questions);
        assert.equal(attempt.userAnswersSnapshot, userAnswers);
        assert.deepEqual(
            { hits: attempt.hits, errors: attempt.errors, unanswered: attempt.unanswered, scorePct: attempt.scorePct },
            { hits: 1, errors: 0, unanswered: 3, scorePct: 25 }
        );
    });

    test('usa "Aspirante" cuando el alias está vacío', () => {
        const base = { questions: makeBank(), userAnswers: {}, totalTimeSeconds: 0 };

        assert.equal(createAttempt({ ...base, alias: '' }).candidateAlias, 'Aspirante');
        assert.equal(createAttempt({ ...base, alias: '   ' }).candidateAlias, 'Aspirante');
    });

    test('al guardar, el intento queda en el historial y el examen activo se borra', () => {
        const questions = makeBank();
        const attempt = createAttempt({ questions, userAnswers: {}, alias: 'Ana', totalTimeSeconds: 10 });

        Storage.setActiveQuiz({ questions, userAnswers: {}, currentIndex: 1, accumulatedMs: 0 });
        assert.equal(Storage.saveAttempt(attempt), true);
        assert.equal(Storage.clearActiveQuiz(), true);

        assert.equal(Storage.getHistory().length, 1);
        assert.equal(Storage.getHistory()[0].id, attempt.id);
        assert.equal(Storage.getActiveQuiz(), null);
    });
});

describe('CU-04 — Formateadores tolerantes a datos corruptos', () => {
    test('una fecha inválida devuelve un guion', () => {
        assert.equal(formatDate('no-es-una-fecha'), '—');
        assert.equal(formatDate(''), '—');
        assert.equal(formatDate(null), '—');
    });

    test('un porcentaje no finito devuelve un guion', () => {
        assert.equal(formatPct(NaN), '—');
        assert.equal(formatPct(Infinity), '—');
        assert.equal(formatPct('50'), '—');
    });

    test('un tiempo no finito o negativo devuelve 00:00', () => {
        assert.equal(formatTime(NaN), '00:00');
        assert.equal(formatTime(Infinity), '00:00');
        assert.equal(formatTime(-5), '00:00');
    });
});

describe('CU-04 — Guardado robusto', () => {
    test('guardar con scs_history corrupto no lanza y deja el intento visible', () => {
        localStorage.setItem('scs_history', '{');
        const attempt = storedAttempt(10);

        assert.equal(Storage.saveAttempt(attempt), true);

        const history = Storage.getHistory();
        assert.equal(history.length, 1);
        assert.equal(history[0].id, attempt.id);
    });

    test('guardar conserva las entradas inválidas del historial crudo', () => {
        const previous = storedAttempt(20);
        localStorage.setItem('scs_history', JSON.stringify([null, previous]));

        const fresh = storedAttempt(21);
        assert.equal(Storage.saveAttempt(fresh), true);

        const raw = JSON.parse(localStorage.getItem('scs_history'));
        assert.equal(raw.length, 3);
        assert.equal(raw[0].id, fresh.id);
        assert.equal(raw[1], null);
        assert.equal(raw[2].id, previous.id);
        assert.deepEqual(Storage.getHistory().map(item => item.id), [fresh.id, previous.id]);
    });

    test('un fallo de setItem no se propaga y devuelve false', () => {
        globalThis.localStorage = createFailingStorage({ failOnSet: true });

        assert.equal(Storage.saveAttempt(storedAttempt(30)), false);
    });

    test('el aviso de escritura fallida se emite una sola vez por clave', () => {
        globalThis.localStorage = createFailingStorage({ failOnSet: true });
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args.join(' '));

        try {
            assert.equal(Storage.setActiveQuiz({ questions: makeBank() }), false);
            assert.equal(Storage.setActiveQuiz({ questions: makeBank() }), false);
        } finally {
            console.warn = originalWarn;
        }

        assert.equal(warnings.length, 1);
    });

    test('un fallo de removeItem en clearHistory devuelve false sin propagar', () => {
        globalThis.localStorage = createFailingStorage({ failOnRemove: true });

        assert.equal(Storage.clearHistory(), false);
    });
});
