import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuiz, shuffle } from '../../js/engine.js';
import { makeBank } from '../helpers/fixtures.js';

describe('CU-01 — Iniciar simulacro', () => {
    test('selecciona el número de preguntas solicitado', () => {
        const quiz = buildQuiz(makeBank(), '2');
        assert.equal(quiz.length, 2);
    });

    test('"max" usa todo el banco disponible', () => {
        const bank = makeBank();
        const quiz = buildQuiz(bank, 'max');
        assert.equal(quiz.length, bank.length);
    });

    test('no repite preguntas', () => {
        const quiz = buildQuiz(makeBank(), 'max');
        const ids = quiz.map(q => q.id);
        assert.equal(new Set(ids).size, ids.length);
    });

    test('todas las preguntas pertenecen al banco', () => {
        const bank = makeBank();
        const bankIds = new Set(bank.map(q => q.id));
        const quiz = buildQuiz(bank, '3');
        assert.ok(quiz.every(q => bankIds.has(q.id)));
    });

    test('conserva el orden original de las opciones', () => {
        const bank = makeBank();
        const quiz = buildQuiz(bank, 'max', () => 0.5);

        quiz.forEach(question => {
            const original = bank.find(q => q.id === question.id);
            assert.deepEqual(question.options, original.options);
        });
    });

    test('devuelve copias y no muta el banco', () => {
        const bank = makeBank();
        const before = JSON.stringify(bank);

        const quiz = buildQuiz(bank, 'max');
        quiz[0].statement = 'Enunciado modificado';

        assert.equal(JSON.stringify(bank), before);
    });

    test('si se piden más preguntas que las disponibles, usa el banco completo', () => {
        const bank = makeBank();
        const quiz = buildQuiz(bank, '99');
        assert.equal(quiz.length, bank.length);
    });

    test('shuffle conserva todos los elementos y es determinista con RNG inyectado', () => {
        const bank = makeBank();
        const a = shuffle(bank, () => 0);
        const b = shuffle(bank, () => 0);

        assert.deepEqual(a, b);
        assert.deepEqual(
            a.map(q => q.id).sort(),
            bank.map(q => q.id).sort()
        );
    });
});
