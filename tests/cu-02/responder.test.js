import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActiveQuizSnapshot, toggleAnswer } from '../../js/engine.js';
import { makeBank } from '../helpers/fixtures.js';

describe('CU-02 — Responder y navegar', () => {
    test('marca una opción como respuesta', () => {
        const answers = {};
        toggleAnswer(answers, 'T-001', 'B');
        assert.deepEqual(answers, { 'T-001': 'B' });
    });

    test('volver a pulsar la misma opción desmarca la respuesta', () => {
        const answers = {};
        toggleAnswer(answers, 'T-001', 'B');
        toggleAnswer(answers, 'T-001', 'B');
        assert.deepEqual(answers, {});
    });

    test('elegir otra opción reemplaza la anterior', () => {
        const answers = {};
        toggleAnswer(answers, 'T-001', 'B');
        toggleAnswer(answers, 'T-001', 'C');
        assert.deepEqual(answers, { 'T-001': 'C' });
    });

    test('las respuestas de preguntas distintas no se pisan', () => {
        const answers = {};
        toggleAnswer(answers, 'T-001', 'B');
        toggleAnswer(answers, 'T-002', 'A');
        assert.deepEqual(answers, { 'T-001': 'B', 'T-002': 'A' });
    });

    test('devuelve el mismo objeto de respuestas', () => {
        const answers = {};
        assert.equal(toggleAnswer(answers, 'T-003', 'D'), answers);
    });

    test('el snapshot de examen en curso guarda respuestas, posición y tiempo', () => {
        const questions = makeBank();
        const userAnswers = { 'T-001': 'B' };

        const snapshot = buildActiveQuizSnapshot({
            questions,
            userAnswers,
            currentIndex: 2,
            accumulatedMs: 4200
        });

        assert.deepEqual(snapshot, {
            questions,
            userAnswers,
            currentIndex: 2,
            accumulatedMs: 4200
        });
    });
});
