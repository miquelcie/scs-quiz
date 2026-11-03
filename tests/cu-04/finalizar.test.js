import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createAttempt, formatPct, formatTime, scoreQuiz } from '../../js/engine.js';
import { Storage } from '../../js/storage.js';
import { makeBank } from '../helpers/fixtures.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
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
        Storage.saveAttempt(attempt);
        Storage.clearActiveQuiz();

        assert.equal(Storage.getHistory().length, 1);
        assert.equal(Storage.getHistory()[0].id, attempt.id);
        assert.equal(Storage.getActiveQuiz(), null);
    });
});
