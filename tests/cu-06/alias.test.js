import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ALIAS_MAX_LENGTH, isValidAlias, sanitizeAlias } from '../../js/engine.js';
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

describe('CU-06 — Saneado del alias', () => {
    test('la longitud máxima es 30', () => {
        assert.equal(ALIAS_MAX_LENGTH, 30);
    });

    test('conserva letras, tildes, ñ, dígitos, guion y guion bajo', () => {
        assert.equal(sanitizeAlias('maria_rodriguez-01'), 'maria_rodriguez-01');
        assert.equal(sanitizeAlias('María_Ñandú'), 'María_Ñandú');
        assert.equal(sanitizeAlias('ÁÉÍÓÚÜáéíóúü'), 'ÁÉÍÓÚÜáéíóúü');
    });

    test('elimina espacios aunque estén en medio del alias', () => {
        assert.equal(sanitizeAlias('María Rodríguez'), 'MaríaRodríguez');
        assert.equal(sanitizeAlias('  Ana  '), 'Ana');
    });

    test('elimina arrobas, puntos y otros símbolos', () => {
        assert.equal(sanitizeAlias('ana@example.com'), 'anaexamplecom');
        assert.equal(sanitizeAlias('ana#1/2\\3?4%5'), 'ana12345');
    });

    test('elimina emojis', () => {
        assert.equal(sanitizeAlias('Ana😀Pérez'), 'AnaPérez');
    });

    test('recorta a 30 caracteres tras filtrar', () => {
        const longAlias = 'a'.repeat(31);
        assert.equal(sanitizeAlias(longAlias), 'a'.repeat(30));
        assert.equal(sanitizeAlias(longAlias).length, ALIAS_MAX_LENGTH);
    });

    test('filtrar antes de recortar no consume longitud con caracteres eliminados', () => {
        const alias = `${'a'.repeat(29)}@@b`;
        assert.equal(sanitizeAlias(alias), `${'a'.repeat(29)}b`);
    });

    test('devuelve cadena vacía para valores que no son string sin lanzar', () => {
        assert.equal(sanitizeAlias(null), '');
        assert.equal(sanitizeAlias(undefined), '');
        assert.equal(sanitizeAlias(42), '');
        assert.equal(sanitizeAlias(['Ana']), '');
        assert.equal(sanitizeAlias({ alias: 'Ana' }), '');
    });
});

describe('CU-06 — Validación del alias', () => {
    test('acepta la cadena vacía porque el alias es opcional', () => {
        assert.equal(isValidAlias(''), true);
    });

    test('acepta alias con letras, tildes, ñ, dígitos, guion y guion bajo', () => {
        assert.equal(isValidAlias('maria'), true);
        assert.equal(isValidAlias('María_Ñandú'), true);
        assert.equal(isValidAlias('maria-01'), true);
    });

    test('rechaza espacios, arrobas, puntos y emojis', () => {
        assert.equal(isValidAlias('María Rodríguez'), false);
        assert.equal(isValidAlias('ana@example.com'), false);
        assert.equal(isValidAlias('ana😀'), false);
    });

    test('rechaza alias de más de 30 caracteres', () => {
        assert.equal(isValidAlias('a'.repeat(30)), true);
        assert.equal(isValidAlias('a'.repeat(31)), false);
    });

    test('no lanza con tipos inesperados y los considera inválidos', () => {
        assert.equal(isValidAlias(null), false);
        assert.equal(isValidAlias(undefined), false);
        assert.equal(isValidAlias(42), false);
        assert.equal(isValidAlias(['Ana']), false);
        assert.equal(isValidAlias({ alias: 'Ana' }), false);
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
