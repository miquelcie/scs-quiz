import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../../js/storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
});

describe('CU-05 — Historial de intentos', () => {
    test('sin historial devuelve un array vacío', () => {
        assert.deepEqual(Storage.getHistory(), []);
    });

    test('el intento más reciente queda primero', () => {
        Storage.saveAttempt({ id: 'att_1' });
        Storage.saveAttempt({ id: 'att_2' });

        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_2', 'att_1']);
    });

    test('consultar el historial no lo modifica', () => {
        Storage.saveAttempt({ id: 'att_1' });
        Storage.saveAttempt({ id: 'att_2' });
        const before = localStorage.getItem('scs_history');

        Storage.getHistory();
        Storage.getHistory();

        assert.equal(localStorage.getItem('scs_history'), before);
        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_2', 'att_1']);
    });

    test('elimina el intento indicado', () => {
        Storage.saveAttempt({ id: 'att_1' });
        Storage.saveAttempt({ id: 'att_2' });

        Storage.deleteAttempt('att_1');

        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_2']);
    });

    test('un identificador inexistente no altera el historial', () => {
        Storage.saveAttempt({ id: 'att_1' });

        Storage.deleteAttempt('att_999');

        assert.deepEqual(Storage.getHistory().map(a => a.id), ['att_1']);
    });

    test('borrar el historial lo deja vacío', () => {
        Storage.saveAttempt({ id: 'att_1' });
        Storage.clearHistory();

        assert.deepEqual(Storage.getHistory(), []);
    });
});
