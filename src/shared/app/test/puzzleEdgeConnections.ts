import assert from 'assert';
import { describe, it } from 'mocha';
import type { Move } from '@playhex/move-notation';
import { findEdgePath, getBoardEdge, getEdgePaths, getReachableEdges, getSolverFilledPosition } from '../puzzles/edgeConnections.js';
import { validatePuzzle, type PuzzleDefinition } from '../puzzles/puzzleTree.js';

/**
 * 5x5, playable area is rows 3 to 5, rows 1 and 2 are disabled.
 */
const disabledCells: Move[] = ['a1', 'b1', 'c1', 'd1', 'e1', 'a2', 'b2', 'c2', 'd2', 'e2'];
const position = { boardsize: 5, redStones: ['c3'] as Move[], blueStones: ['a3'] as Move[], disabledCells };

describe('puzzle edge connections', () => {
    it('finds a path through disabled cells to the edge', () => {
        const path = findEdgePath(position, { move: 'c3', edge: 0 });

        assert.ok(path);
        assert.strictEqual(path.length, 2);
        assert.ok(path.every(cell => disabledCells.includes(cell)));
        assert.ok(['c1', 'd1'].includes(path[path.length - 1]));
    });

    it('avoids cells next to playable cells when possible', () => {
        // Row 2 cells are all next to row 3, but path must cross row 2 anyway: only once
        const path = findEdgePath(position, { move: 'c3', edge: 0 })!;

        assert.strictEqual(path.filter(cell => cell.endsWith('2')).length, 1);
    });

    it('cannot reach an edge without disabled cells', () => {
        assert.strictEqual(findEdgePath(position, { move: 'c3', edge: 1 }), null);
        assert.deepStrictEqual(getReachableEdges(position, 'c3'), [0]);

        // Blue a3 is on its left edge already
        assert.deepStrictEqual(findEdgePath(position, { move: 'a3', edge: 0 }), []);
    });

    it('reports connections blocked by other paths', () => {
        // Only cell to cross: c2 leads to c1/d1, both stones need it
        const narrow = { boardsize: 3, redStones: ['b3'] as Move[], blueStones: ['a3'] as Move[], disabledCells: ['b2', 'b1'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(narrow, [{ move: 'b3', edge: 0 }]), { red: ['b2', 'b1'], blue: [], impossible: [] });
        assert.deepStrictEqual(getEdgePaths(narrow, [{ move: 'b3', edge: 0 }, { move: 'b3', edge: 0 }]).impossible, [1]);
    });

    it('points arrows to edges', () => {
        assert.strictEqual(getBoardEdge(0, 0), 'top');
        assert.strictEqual(getBoardEdge(1, 1), 'right');
    });

    it('validates edge connections', () => {
        const puzzle: PuzzleDefinition = { ...position, playerColor: 0, tree: { children: [{ move: 'c4' }] } };
        const codes = (edgeConnections: unknown) => validatePuzzle({ ...puzzle, edgeConnections: edgeConnections as PuzzleDefinition['edgeConnections'] }).map(error => error.code);

        assert.deepStrictEqual(codes([{ move: 'c3', edge: 0 }]), []);
        assert.deepStrictEqual(codes([{ move: 'c3', edge: 1 }]), ['edge_connection_impossible']);
        assert.deepStrictEqual(codes([{ move: 'c4', edge: 0 }]), ['edge_connection_not_stone']);
        assert.deepStrictEqual(codes([{ move: 'c3', edge: 0 }, { move: 'c3', edge: 0 }]), ['edge_connection_twice']);
        assert.deepStrictEqual(codes([{ move: 'c3', edge: 2 }]), ['invalid_edge_connections']);
        assert.deepStrictEqual(codes('c3'), ['invalid_edge_connections']);
    });

    it('fills disabled cells as sent to solver', () => {
        const connections = [{ move: 'c3', edge: 0 } as const];
        const path = findEdgePath(position, connections[0])!;

        // Red player: opponent stones, but red path to top
        const win = getSolverFilledPosition(position, connections, 0, 'win');

        assert.deepStrictEqual([...win.redStones].sort(), ['c3', ...path].sort());
        assert.deepStrictEqual([...win.blueStones].sort(), ['a3', ...disabledCells.filter(cell => !path.includes(cell))].sort());

        // Player stones everywhere, path is red anyway
        const notWin = getSolverFilledPosition(position, connections, 0, 'notWin');

        assert.deepStrictEqual([...notWin.redStones].sort(), ['c3', ...disabledCells].sort());
        assert.deepStrictEqual(notWin.blueStones, ['a3']);
    });
});
