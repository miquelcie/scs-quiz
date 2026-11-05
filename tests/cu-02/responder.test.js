import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActiveQuizSnapshot, isQuizInProgress, moveIndex, toggleAnswer } from '../../js/engine.js';
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

    test('el snapshot no muta el estado de origen', () => {
        const source = {
            questions: makeBank(),
            userAnswers: { 'T-001': 'B' },
            currentIndex: 2,
            accumulatedMs: 4200
        };

        const snapshot = buildActiveQuizSnapshot(source);
        snapshot.currentIndex = 4;
        snapshot.accumulatedMs = 1;

        assert.equal(source.currentIndex, 2);
        assert.equal(source.accumulatedMs, 4200);
    });

    test('moveIndex cumple los casos de aceptación de 001', () => {
        assert.equal(moveIndex(0, 5, 1), 1);
        assert.equal(moveIndex(4, 5, 1), 4);
        assert.equal(moveIndex(0, 5, -1), 0);
        assert.equal(moveIndex(2, 0, 1), 0);
    });

    test('moveIndex avanza, retrocede y se detiene en los límites', () => {
        assert.equal(moveIndex(1, 5, 1), 2);
        assert.equal(moveIndex(2, 5, -1), 1);
        assert.equal(moveIndex(4, 5, 1), 4);
        assert.equal(moveIndex(0, 5, -1), 0);
    });

    test('moveIndex con total 0 devuelve 0 sin lanzar', () => {
        assert.equal(moveIndex(2, 0, 1), 0);
        assert.equal(moveIndex(2, 0, -1), 0);
    });

    test('moveIndex con delta 0 recorta un índice fuera de rango', () => {
        assert.equal(moveIndex(999, 10, 0), 9);
        assert.equal(moveIndex(-3, 10, 0), 0);
    });

    test('isQuizInProgress distingue índices válidos e inválidos', () => {
        const questions = makeBank();

        assert.equal(isQuizInProgress([], 0), false);
        assert.equal(isQuizInProgress(null, 0), false);
        assert.equal(isQuizInProgress(questions, -1), false);
        assert.equal(isQuizInProgress(questions, questions.length), false);
        assert.equal(isQuizInProgress(questions, 1.5), false);
        assert.equal(isQuizInProgress(questions, 0), true);
        assert.equal(isQuizInProgress(questions, questions.length - 1), true);
    });
});
