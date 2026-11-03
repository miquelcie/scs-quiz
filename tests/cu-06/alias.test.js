import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../../js/storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
});

describe('CU-06 — Alias del aspirante', () => {
    test('sin alias guardado devuelve cadena vacía', () => {
        assert.equal(Storage.getAlias(), '');
    });

    test('guarda el alias sin espacios sobrantes', () => {
        Storage.setAlias('  Ana  ');
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
