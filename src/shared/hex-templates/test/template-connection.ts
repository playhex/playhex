import assert from 'assert';
import { describe, it } from 'mocha';
import type { Move } from '@playhex/move-notation';
import { findTemplateConnection, findTemplateInstances, type TemplatePosition } from '../template-connection.js';

describe('template-connection', () => {
    it('finds completed connection without templates', () => {
        assert.deepStrictEqual(findTemplateConnection({
            boardsize: 3,
            own: ['b1', 'b2', 'b3'],
            opponent: [],
            color: 0,
            templateIds: [],
        }), []);

        assert.strictEqual(findTemplateConnection({
            boardsize: 3,
            own: ['b2'],
            opponent: [],
            color: 0,
            templateIds: [],
        }), null);
    });

    it('connects with bridges to both edges', () => {
        // b2 bridges to top (b1 c1), and to bottom (a3 b3)
        const position = { boardsize: 3, own: ['b2'] as Move[], opponent: [], color: 0 as const };

        assert.strictEqual(findTemplateConnection({ ...position, templateIds: [] }), null);

        const connection = findTemplateConnection({ ...position, templateIds: ['bridge'] });

        assert.ok(connection);
        assert.strictEqual(connection.length, 2);
    });

    it('chains stone bridges', () => {
        // c2 bridges to top, b4 to bottom, and c2 - b4 is a bridge (carrier b3 c3)
        const connection = findTemplateConnection({
            boardsize: 5,
            own: ['c2', 'b4'],
            opponent: [],
            color: 0,
            templateIds: ['bridge'],
        });

        assert.ok(connection);
        assert.ok(connection.some(instance => instance.edge === undefined));
    });

    it('rejects broken or missing templates', () => {
        // Opponent stone in one edge bridge carrier
        assert.strictEqual(findTemplateConnection({
            boardsize: 3,
            own: ['b2'],
            opponent: ['a3'],
            color: 0,
            templateIds: ['bridge'],
        }), null);

        // a2 bridges to top, but has only one bottom neighbour
        assert.strictEqual(findTemplateConnection({
            boardsize: 3,
            own: ['a2'],
            opponent: [],
            color: 0,
            templateIds: ['bridge'],
        }), null);
    });

    it('finds stones bridges once', () => {
        const instances = findTemplateInstances({
            boardsize: 5,
            own: ['b2', 'c3'],
            opponent: [],
            color: 0,
            templateIds: ['bridge'],
        });

        const stonesBridges = instances.filter(instance => instance.edge === undefined);

        assert.strictEqual(stonesBridges.length, 1);
        assert.deepStrictEqual([...stonesBridges[0].carrier].sort(), ['b3', 'c2']);
    });

    it('accepts ziggurat only when acquired', () => {
        // Red stone in center of 5x5: ziggurat to top (b3 b2 c2 d2 b1 c1 d1 e1), and to bottom (d3 b4 c4 d4 a5 b5 c5 d5)
        const position = { boardsize: 5, opponent: [], color: 0 as const };

        assert.strictEqual(findTemplateConnection({ ...position, own: ['c3'], templateIds: ['bridge'] }), null);
        assert.strictEqual(findTemplateConnection({ ...position, own: ['c3'], templateIds: ['bridge', 'ziggurat'] })?.length, 2);

        // Intrusion in one ziggurat
        assert.strictEqual(findTemplateConnection({ ...position, own: ['c3'], opponent: ['c1'], templateIds: ['ziggurat'] }), null);
    });

    it('works for blue', () => {
        assert.strictEqual(findTemplateConnection({ boardsize: 3, own: ['b2'], opponent: [], color: 1, templateIds: [] }), null);
        assert.ok(findTemplateConnection({ boardsize: 3, own: ['b2'], opponent: [], color: 1, templateIds: ['bridge'] }));
        assert.strictEqual(findTemplateConnection({ boardsize: 3, own: ['b2'], opponent: ['c1'], color: 1, templateIds: ['bridge'] }), null);
    });

    it('rejects disabled cells in carrier', () => {
        assert.strictEqual(findTemplateConnection({
            boardsize: 3,
            own: ['b2'],
            opponent: [],
            disabledCells: ['b1'],
            color: 0,
            templateIds: ['bridge'],
        }), null);
    });

    it('rejects templates sharing a carrier cell', () => {
        // a2 bridges to c1 (carrier b1 b2) and to b3 (carrier a3 b2): both use b2
        const position: TemplatePosition = { boardsize: 3, own: ['c1', 'a2', 'b3'], opponent: ['a1', 'c2'], color: 0, templateIds: ['bridge'] };

        assert.strictEqual(findTemplateConnection(position), null);
        assert.strictEqual(findTemplateConnection({ ...position, own: [...position.own, 'b2'] })?.length, 0);
    });

    it('uses declared edge connections', () => {
        const position: TemplatePosition = { boardsize: 3, own: ['b2', 'b3'], opponent: [], color: 0, templateIds: [] };

        assert.strictEqual(findTemplateConnection(position), null);
        assert.deepStrictEqual(findTemplateConnection({ ...position, edgeConnections: [{ move: 'b2', edge: 0 }] }), []);
        assert.strictEqual(findTemplateConnection({ ...position, edgeConnections: [{ move: 'b2', edge: 1 }] }), null);
    });
});
