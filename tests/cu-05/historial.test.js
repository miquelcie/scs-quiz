import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
    createAttempt,
    escapeHTML,
    normalizeAttempt,
    normalizeHistory
} from '../../js/engine.js';
import { HISTORY_LIMIT, Storage } from '../../js/storage.js';
import { makeBank } from '../helpers/fixtures.js';
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

describe('CU-05 — Historial de intentos', () => {
    test('sin historial devuelve un array vacío', () => {
        assert.deepEqual(Storage.getHistory(), []);
    });

    test('un historial con JSON inválido o forma incorrecta devuelve [] sin escribirlo', () => {
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args.join(' '));

        try {
            ['null', '{}', '"texto"', '3', '{'].forEach(raw => {
                localStorage.setItem('scs_history', raw);
                assert.deepEqual(Storage.getHistory(), []);
                assert.equal(localStorage.getItem('scs_history'), raw);
            });
        } finally {
            console.warn = originalWarn;
        }

        assert.equal(warnings.length, 1);
    });

    test('el intento más reciente queda primero', () => {
        Storage.saveAttempt(storedAttempt(1));
        Storage.saveAttempt(storedAttempt(2));

        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_2', 'att_1']);
    });

    test('consultar el historial no lo modifica', () => {
        Storage.saveAttempt(storedAttempt(1));
        Storage.saveAttempt(storedAttempt(2));
        const before = localStorage.getItem('scs_history');

        Storage.getHistory();
        Storage.getHistory();

        assert.equal(localStorage.getItem('scs_history'), before);
        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_2', 'att_1']);
    });

    test('elimina el intento indicado', () => {
        Storage.saveAttempt(storedAttempt(1));
        Storage.saveAttempt(storedAttempt(2));

        assert.equal(Storage.deleteAttempt('att_1'), true);

        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_2']);
    });

    test('un identificador inexistente no altera el historial', () => {
        Storage.saveAttempt(storedAttempt(1));

        assert.equal(Storage.deleteAttempt('att_999'), true);

        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_1']);
    });

    test('borrar el historial lo deja vacío', () => {
        Storage.saveAttempt(storedAttempt(1));
        assert.equal(Storage.clearHistory(), true);

        assert.deepEqual(Storage.getHistory(), []);
    });
});

describe('CU-05 — Historial crudo y datos no confiables', () => {
    test('readRawHistory devuelve el array crudo sin filtrar entradas inválidas', () => {
        const valid = storedAttempt(10);
        localStorage.setItem('scs_history', JSON.stringify([null, valid, { id: 'roto' }]));
        const before = localStorage.getItem('scs_history');

        const raw = Storage.readRawHistory();

        assert.equal(raw.length, 3);
        assert.equal(raw[0], null);
        assert.equal(raw[1].id, valid.id);
        assert.equal(raw[2].id, 'roto');
        assert.equal(localStorage.getItem('scs_history'), before);
    });

    test('readRawHistory devuelve [] si el nivel superior no es un array', () => {
        localStorage.setItem('scs_history', '{"id":"att_1"}');
        const before = localStorage.getItem('scs_history');

        assert.deepEqual(Storage.readRawHistory(), []);
        assert.equal(localStorage.getItem('scs_history'), before);
    });

    test('deleteAttempt conserva las entradas inválidas del array crudo', () => {
        const first = storedAttempt(11);
        const second = storedAttempt(12);
        localStorage.setItem('scs_history', JSON.stringify([null, first, second]));

        assert.equal(Storage.deleteAttempt(first.id), true);

        const raw = JSON.parse(localStorage.getItem('scs_history'));
        assert.equal(raw.length, 2);
        assert.equal(raw[0], null);
        assert.equal(raw[1].id, second.id);
        assert.deepEqual(Storage.getHistory().map(item => item.id), [second.id]);
    });

    test('normalizeHistory filtra entradas no representables y avisa al normalizar', () => {
        const valid = storedAttempt(13);
        const history = normalizeHistory([
            null,
            {},
            { id: '' },
            { id: 'sin-snapshots' },
            { ...valid, date: 'no-es-fecha', scorePct: '100' }
        ]);

        assert.equal(history.length, 1);
        assert.equal(history[0].id, valid.id);
        assert.equal(history[0].date, '');
        assert.equal(history[0].scorePct, 25);
    });

    test('normalizeAttempt recalcula métricas y normaliza sus campos', () => {
        const attempt = {
            ...storedAttempt(14),
            candidateAlias: 42,
            date: 'fecha-rota',
            hits: 999,
            errors: 999,
            unanswered: 999,
            scorePct: '100',
            totalTimeSeconds: '90'
        };

        const normalized = normalizeAttempt(attempt);

        assert.equal(normalized.candidateAlias, 'Aspirante');
        assert.equal(normalized.date, '');
        assert.equal(normalized.hits, 1);
        assert.equal(normalized.errors, 0);
        assert.equal(normalized.unanswered, 3);
        assert.equal(normalized.scorePct, 25);
        assert.equal(normalized.totalTimeSeconds, 0);
    });

    test('normalizeAttempt rechaza intentos sin forma representable', () => {
        const valid = storedAttempt(15);

        assert.equal(normalizeAttempt(null), null);
        assert.equal(normalizeAttempt({ ...valid, id: '' }), null);
        assert.equal(normalizeAttempt({ ...valid, questionsSnapshot: [] }), null);
        assert.equal(normalizeAttempt({ ...valid, userAnswersSnapshot: null }), null);
        assert.equal(normalizeAttempt({ ...valid, userAnswersSnapshot: [] }), null);
        assert.equal(
            normalizeAttempt({ ...valid, questionsSnapshot: [{ id: '', options: [] }] }),
            null
        );
    });

    test('escapeHTML neutraliza etiquetas y comillas', () => {
        assert.equal(
            escapeHTML('<img src=x onerror="alert(1)">'),
            '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
        );
    });
});

describe('CU-05 — Límite del historial', () => {
    // Siembra `count` intentos válidos, del más antiguo (now=1) al más reciente.
    const seedHistory = count => {
        for (let now = 1; now <= count; now++) Storage.saveAttempt(storedAttempt(now));
    };

    test('el límite del historial es 50 intentos', () => {
        assert.equal(HISTORY_LIMIT, 50);
    });

    test('getHistoryLength devuelve 0 sin historial', () => {
        assert.equal(Storage.getHistoryLength(), 0);
    });

    test('getHistoryLength cuenta las entradas guardadas', () => {
        seedHistory(3);

        assert.equal(Storage.getHistoryLength(), 3);
    });

    test('getHistoryLength no lanza con el historial corrupto', () => {
        localStorage.setItem('scs_history', '{');

        assert.equal(Storage.getHistoryLength(), 0);
    });

    test('getHistoryLength devuelve 0 si el nivel superior no es un array', () => {
        localStorage.setItem('scs_history', '{"id":"att_1"}');

        assert.equal(Storage.getHistoryLength(), 0);
    });

    test('getHistoryLength cuenta también las entradas inválidas del crudo', () => {
        localStorage.setItem('scs_history', JSON.stringify([null, storedAttempt(1), { id: 'roto' }]));

        assert.equal(Storage.getHistoryLength(), 3);
    });

    test('sin rotación se conservan todas las entradas aunque superen el límite', () => {
        seedHistory(HISTORY_LIMIT);

        assert.equal(Storage.saveAttempt(storedAttempt(HISTORY_LIMIT + 1)), true);
        assert.equal(Storage.getHistoryLength(), HISTORY_LIMIT + 1);
    });

    test('la rotación elimina el intento más antiguo al superar el límite', () => {
        seedHistory(HISTORY_LIMIT);

        assert.equal(
            Storage.saveAttempt(storedAttempt(HISTORY_LIMIT + 1), { rotate: true }),
            true
        );

        const history = Storage.getHistory();
        assert.equal(history.length, HISTORY_LIMIT);
        assert.equal(history[0].id, `att_${HISTORY_LIMIT + 1}`);
        assert.equal(history[history.length - 1].id, 'att_2');
        assert.ok(!history.some(item => item.id === 'att_1'));
    });

    test('la rotación no elimina nada mientras no se supere el límite', () => {
        seedHistory(3);

        assert.equal(Storage.saveAttempt(storedAttempt(4), { rotate: true }), true);
        assert.equal(Storage.getHistoryLength(), 4);
        assert.deepEqual(
            Storage.getHistory().map(item => item.id),
            ['att_4', 'att_3', 'att_2', 'att_1']
        );
    });

    test('la rotación conserva las entradas inválidas del crudo', () => {
        const valid = [];
        for (let now = HISTORY_LIMIT; now >= 1; now--) valid.push(storedAttempt(now));
        localStorage.setItem('scs_history', JSON.stringify([...valid, null]));

        assert.equal(Storage.saveAttempt(storedAttempt(HISTORY_LIMIT + 1), { rotate: true }), true);

        const raw = JSON.parse(localStorage.getItem('scs_history'));
        assert.equal(raw.length, HISTORY_LIMIT + 1);
        assert.equal(raw[raw.length - 1], null);
        assert.equal(raw[0].id, `att_${HISTORY_LIMIT + 1}`);

        const history = Storage.getHistory();
        assert.equal(history.length, HISTORY_LIMIT);
        assert.equal(history[history.length - 1].id, 'att_2');
    });

    test('la rotación nunca elimina el intento recién guardado si no hay antiguos representables', () => {
        localStorage.setItem('scs_history', JSON.stringify(Array(HISTORY_LIMIT).fill(null)));
        const fresh = storedAttempt(1);

        assert.equal(Storage.saveAttempt(fresh, { rotate: true }), true);

        const raw = JSON.parse(localStorage.getItem('scs_history'));
        assert.equal(raw.length, HISTORY_LIMIT + 1);
        assert.equal(raw[0].id, fresh.id);
        assert.ok(raw.slice(1).every(item => item === null));
    });

    test('el intento guardado con rotación queda primero y es recuperable', () => {
        seedHistory(HISTORY_LIMIT);
        const fresh = storedAttempt(HISTORY_LIMIT + 1);

        Storage.saveAttempt(fresh, { rotate: true });

        assert.equal(Storage.getHistory()[0].id, fresh.id);
        assert.equal(Storage.getHistory()[0].scorePct, fresh.scorePct);
    });
});
