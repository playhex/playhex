import assert from 'assert';
import { describe, it } from 'mocha';
import { sgfFromString } from '../../sgf/index.js';
import { sgfToTreeNodes } from '../hexplorerSgf.js';
import { parseHexplorerState, createHexplorerState } from '../hexplorerStudy.js';
import { SGF } from '../hex-game-importer/handlers/SGF.js';

const parse = (sgf: string, boardsize = 5) => sgfToTreeNodes(sgfFromString(sgf), boardsize);

describe('sgfToTreeNodes', () => {
    it('reads a line of moves', () => {
        const nodes = parse('(;FF[4]SZ[5];B[a1];W[swap-pieces];B[b2];W[pass])');

        assert.deepStrictEqual(nodes.map(node => node.data), [
            null,
            { type: 'move', move: 'a1' },
            { type: 'move', move: 'swap-pieces' },
            { type: 'move', move: 'b2' },
            { type: 'move', move: 'pass' },
        ]);
    });

    it('reads variations, main line first', () => {
        const nodes = parse('(;SZ[5](;B[a1];W[b2](;B[c3])(;B[d4]))(;B[e5]))');

        const moveOf = (id: number) => nodes[id].data?.type === 'move' ? (nodes[id].data as { move: string }).move : null;

        assert.deepStrictEqual(nodes[0].children.map(moveOf), ['a1', 'e5']);

        const b2 = nodes.find(node => node.data?.type === 'move' && node.data.move === 'b2')!;

        assert.deepStrictEqual(b2.children.map(moveOf), ['c3', 'd4']);
    });

    it('reads setup stones, marks, next player and comments', () => {
        const nodes = parse('(;SZ[5]C[Root];B[a1];AB[b2][c3]AW[d4]AE[a1]PL[W]TR[b2]LB[c3:Abcd]SL[d4]C[Setup];W[e5]C[Move])');

        assert.strictEqual(nodes[0].comment, 'Root');
        assert.deepStrictEqual(nodes[2].data, {
            type: 'setup',
            stones: [{ move: 'b2', color: 0 }, { move: 'c3', color: 0 }, { move: 'd4', color: 1 }],
            marks: [
                { move: 'b2', type: 'triangle' },
                { move: 'd4', type: 'select' },
                { move: 'c3', type: 'label', text: 'Abc' },
            ],
            nextPlayer: 1,
        });
        assert.strictEqual(nodes[2].comment, 'Setup');
        assert.deepStrictEqual(nodes[3].data, { type: 'move', move: 'e5' });
        assert.strictEqual(nodes[3].comment, 'Move');
    });

    it('reads setup stones of root node', () => {
        const nodes = parse('(;SZ[5]AB[a1]AW[b2]PL[W];W[c3])');

        assert.strictEqual(nodes[0].data, null);
        assert.deepStrictEqual(nodes[1].data, {
            type: 'setup',
            stones: [{ move: 'a1', color: 0 }, { move: 'b2', color: 1 }],
            marks: [],
            nextPlayer: 1,
        });
        assert.strictEqual(nodes[2].parentId, 1);
    });

    it('puts marks of a move on a setup node after it', () => {
        const nodes = parse('(;SZ[5];B[a1]TR[b2];W[c3])');

        assert.deepStrictEqual(nodes[2].data, {
            type: 'setup',
            stones: [{ move: 'a1', color: 0 }],
            marks: [{ move: 'b2', type: 'triangle' }],
            nextPlayer: 1,
        });
        assert.strictEqual(nodes[3].parentId, 2);
    });

    it('changes color to play when same color plays twice', () => {
        const nodes = parse('(;SZ[5];B[a1];B[b2])');

        assert.strictEqual(nodes[2].data?.type, 'setup');
        assert.deepStrictEqual(nodes[3].data, { type: 'move', move: 'b2' });
    });

    it('gives comment of an empty node to its parent', () => {
        const nodes = parse('(;SZ[5];B[a1]C[One];C[Two];W[b2])');

        assert.strictEqual(nodes.length, 3);
        assert.strictEqual(nodes[1].comment, 'One\nTwo');
    });

    it('stops a branch on an illegal move, and keeps its variations', () => {
        const nodes = parse('(;SZ[5];B[a1](;W[a1];B[c3])(;W[b2]))');

        assert.deepStrictEqual(nodes.map(node => node.data?.type === 'move' ? node.data.move : null), [null, 'a1', 'b2']);
    });

    it('stops a branch on a swap that cannot be replayed', () => {
        const count = (content: string): number => sgfToTreeNodes(sgfFromString(content), 11).length;

        // Marks add a setup node, which starts a new line of moves
        assert.strictEqual(count('(;SZ[11];B[a1]TR[b2];W[swap-pieces];B[c3])'), 3);
        assert.strictEqual(count('(;SZ[11];B[a1];W[b2];B[swap-pieces])'), 3);
        assert.strictEqual(count('(;SZ[11];B[a1];B[swap-pieces])'), 2);
        assert.strictEqual(count('(;SZ[11];B[a1];W[swap-pieces];B[c3])'), 4);
    });

    it('ignores cells out of board', () => {
        const nodes = parse('(;SZ[3];B[a1];AB[e5]TR[f6];W[d4])', 3);

        assert.strictEqual(nodes.length, 2);
    });

    it('gives a valid tree', () => {
        const nodes = parse('(;SZ[5]AB[a1]C[Root](;W[b2]TR[c3])(;W[d4];B[e5]))');

        assert.doesNotThrow(() => parseHexplorerState({ ...createHexplorerState(5), nodes }));
    });
});

describe('SGF importer', () => {
    it('keeps main line in moves, and gives whole tree', async () => {
        const game = await new SGF().import('(;SZ[5]PB[Alice](;B[a1];W[b2])(;B[c3]))');

        assert.strictEqual(game.boardsize, 5);
        assert.strictEqual(game.playerBlackName, 'Alice');
        assert.deepStrictEqual(game.moves, ['a1', 'b2']);
        assert.strictEqual(game.tree?.length, 4);
    });
});
