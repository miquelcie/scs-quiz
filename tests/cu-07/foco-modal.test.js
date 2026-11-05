import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFocusIndex } from '../../js/engine.js';

describe('CU-07 — Ciclo de foco del modal', () => {
    test('avanzar desde el primer control devuelve el segundo', () => {
        assert.equal(nextFocusIndex(0, 2, false), 1);
    });

    test('avanzar desde el último control vuelve al primero', () => {
        assert.equal(nextFocusIndex(1, 2, false), 0);
    });

    test('retroceder desde el primer control devuelve el último', () => {
        assert.equal(nextFocusIndex(0, 2, true), 1);
    });

    test('retroceder desde el último control devuelve el anterior', () => {
        assert.equal(nextFocusIndex(1, 2, true), 0);
    });

    test('con un solo control avanzar y retroceder devuelven 0', () => {
        assert.equal(nextFocusIndex(0, 1, false), 0);
        assert.equal(nextFocusIndex(0, 1, true), 0);
    });

    test('con total 0 devuelve 0 sin lanzar', () => {
        assert.equal(nextFocusIndex(0, 0, false), 0);
        assert.equal(nextFocusIndex(0, 0, true), 0);
        assert.doesNotThrow(() => nextFocusIndex(3, 0, false));
        assert.doesNotThrow(() => nextFocusIndex(-1, -5, true));
    });

    test('un índice actual fuera de rango se normaliza al primero', () => {
        assert.equal(nextFocusIndex(9, 3, false), 1);
        assert.equal(nextFocusIndex(-4, 3, true), 2);
        assert.equal(nextFocusIndex(1.5, 3, false), 1);
        assert.equal(nextFocusIndex('1', 3, false), 1);
    });

    test('el ciclo recorre todos los controles en ambos sentidos', () => {
        const total = 3;
        assert.equal(nextFocusIndex(0, total, false), 1);
        assert.equal(nextFocusIndex(1, total, false), 2);
        assert.equal(nextFocusIndex(2, total, false), 0);

        assert.equal(nextFocusIndex(0, total, true), 2);
        assert.equal(nextFocusIndex(2, total, true), 1);
        assert.equal(nextFocusIndex(1, total, true), 0);
    });
});
