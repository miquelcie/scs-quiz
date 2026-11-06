import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_PAGE_SIZE, paginate } from '../../js/engine.js';

// Lista de 25 identificadores para ejercitar la paginación.
const makeList = (total = 25) => Array.from({ length: total }, (_, i) => `att_${i + 1}`);

describe('CU-08 — Paginación del historial', () => {
    test('el tamaño de página por defecto es 10', () => {
        assert.equal(HISTORY_PAGE_SIZE, 10);
    });

    test('la primera página devuelve una página completa', () => {
        const result = paginate(makeList(), 1, 10);

        assert.equal(result.items.length, 10);
        assert.equal(result.items[0], 'att_1');
        assert.equal(result.items[9], 'att_10');
        assert.equal(result.page, 1);
        assert.equal(result.pageSize, 10);
        assert.equal(result.total, 25);
        assert.equal(result.totalPages, 3);
        assert.equal(result.hasMore, true);
        assert.equal(result.remaining, 15);
    });

    test('la última página devuelve los elementos restantes', () => {
        const result = paginate(makeList(), 3, 10);

        assert.deepEqual(result.items, ['att_21', 'att_22', 'att_23', 'att_24', 'att_25']);
        assert.equal(result.hasMore, false);
        assert.equal(result.remaining, 0);
    });

    test('page por debajo del rango se recorta a la primera página', () => {
        assert.equal(paginate(makeList(), 0, 10).page, 1);
        assert.equal(paginate(makeList(), -4, 10).page, 1);
    });

    test('page por encima del rango se recorta a la última página', () => {
        const result = paginate(makeList(), 99, 10);

        assert.equal(result.page, 3);
        assert.equal(result.items[0], 'att_21');
        assert.equal(result.hasMore, false);
    });

    test('page no entero se normaliza a la primera página', () => {
        assert.equal(paginate(makeList(), NaN, 10).page, 1);
        assert.equal(paginate(makeList(), 1.5, 10).page, 1);
        assert.equal(paginate(makeList(), null, 10).page, 1);
    });

    test('pageSize inválido usa el tamaño por defecto', () => {
        [0, -5, NaN, 2.5, '10'].forEach(size => {
            const result = paginate(makeList(12), 1, size);
            assert.equal(result.pageSize, HISTORY_PAGE_SIZE, `pageSize ${String(size)}`);
            assert.equal(result.items.length, 10, `pageSize ${String(size)}`);
        });
    });

    test('una lista vacía devuelve una página vacía sin lanzar', () => {
        const result = paginate([], 1, 10);

        assert.deepEqual(result.items, []);
        assert.equal(result.total, 0);
        assert.equal(result.totalPages, 1);
        assert.equal(result.page, 1);
        assert.equal(result.hasMore, false);
        assert.equal(result.remaining, 0);
    });

    test('una entrada que no es array se trata como lista vacía', () => {
        [null, undefined, 42, 'texto', {}].forEach(value => {
            const result = paginate(value, 1, 10);
            assert.deepEqual(result.items, [], `entrada ${String(value)}`);
            assert.equal(result.total, 0, `entrada ${String(value)}`);
            assert.equal(result.hasMore, false, `entrada ${String(value)}`);
        });
    });

    test('argumentos ausentes usan la primera página y el tamaño por defecto', () => {
        const result = paginate(makeList());

        assert.equal(result.page, 1);
        assert.equal(result.pageSize, HISTORY_PAGE_SIZE);
        assert.equal(result.items.length, 10);
    });

    test('no muta la lista de origen', () => {
        const list = makeList();
        const before = JSON.stringify(list);

        paginate(list, 2, 10);

        assert.equal(JSON.stringify(list), before);
    });

    test('recorre toda la lista sin solapamientos ni huecos', () => {
        const list = makeList(23);
        const seen = [];
        let page = 1;
        let result = paginate(list, page, 10);

        while (true) {
            seen.push(...result.items);
            if (!result.hasMore) break;
            page += 1;
            result = paginate(list, page, 10);
        }

        assert.deepEqual(seen, list);
    });

    test('una lista más corta que la página no tiene más páginas', () => {
        const result = paginate(makeList(3), 1, 10);

        assert.equal(result.totalPages, 1);
        assert.equal(result.hasMore, false);
        assert.equal(result.remaining, 0);
        assert.equal(result.items.length, 3);
    });
});
