import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../../js/storage.js';
import { createFailingStorage } from '../helpers/failing-storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
});

afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
});

describe('CU-06 — Alias del aspirante', () => {
    test('sin alias guardado devuelve cadena vacía', () => {
        assert.equal(Storage.getAlias(), '');
    });

    test('guarda el alias sin espacios sobrantes', () => {
        assert.equal(Storage.setAlias('  Ana  '), true);
        assert.equal(Storage.getAlias(), 'Ana');
    });

    test('el alias persiste entre lecturas', () => {
        Storage.setAlias('Ana');
        assert.equal(Storage.getAlias(), 'Ana');
        assert.equal(Storage.getAlias(), 'Ana');
    });

    test('se puede sobrescribir', () => {
        Storage.setAlias('Ana');
        Storage.setAlias('Luis');
        assert.equal(Storage.getAlias(), 'Luis');
    });
});

describe('CU-06 — Almacenamiento bloqueado', () => {
    test('con getItem bloqueado el alias es vacío y el examen activo es null', () => {
        globalThis.localStorage = createFailingStorage({ failOnGet: true });

        assert.equal(Storage.getAlias(), '');
        assert.equal(Storage.getActiveQuiz(), null);
        assert.deepEqual(Storage.getHistory(), []);
    });

    test('un fallo al guardar el alias devuelve false sin propagar', () => {
        globalThis.localStorage = createFailingStorage({ failOnSet: true });

        assert.equal(Storage.setAlias('Ana'), false);
    });

    test('un fallo al guardar el examen activo devuelve false sin propagar', () => {
        globalThis.localStorage = createFailingStorage({ failOnSet: true });

        assert.equal(Storage.setActiveQuiz({ questions: [] }), false);
    });

    test('un fallo al borrar el examen activo devuelve false sin propagar', () => {
        globalThis.localStorage = createFailingStorage({ failOnRemove: true });

        assert.equal(Storage.clearActiveQuiz(), false);
    });
});
