import assert from 'assert';
import { describe, it } from 'mocha';
import { coordsToMove, parseMove, type Coords, type Move } from '@playhex/move-notation';
import { balanceFilledStones, fillDisabledCells, getBoardEdge, getEdgePaths, getReachableEdges, getSolverFilledPosition, type EdgeConnectionsPosition, type PuzzleEdgeConnection, type PuzzleFixedFill, type SolveClaim } from '../puzzles/edgeConnections.js';
import { validatePuzzle, type PuzzleDefinition } from '../puzzles/puzzleTree.js';

/**
 * 5x5, playable area is rows 3 to 5, rows 1 and 2 are disabled.
 */
const disabledCells: Move[] = ['a1', 'b1', 'c1', 'd1', 'e1', 'a2', 'b2', 'c2', 'd2', 'e2'];
const position = { boardsize: 5, redStones: ['c3'] as Move[], blueStones: ['a3'] as Move[], disabledCells };

describe('puzzle edge connections', () => {
    it('finds a path through disabled cells to the edge', () => {
        const { red: path, impossible } = getEdgePaths(position, [{ move: 'c3', edge: 0 }]);

        assert.deepStrictEqual(impossible, []);
        assert.strictEqual(path.length, 2);
        assert.ok(path.every(cell => disabledCells.includes(cell)));
        assert.ok(['c1', 'd1'].includes(path[path.length - 1]));
    });

    it('cannot reach an edge without disabled cells', () => {
        assert.deepStrictEqual(getEdgePaths(position, [{ move: 'c3', edge: 1 }]).impossible, [0]);
        assert.deepStrictEqual(getReachableEdges(position, 'c3'), [0]);

        // Blue a3 is on its left edge already
        assert.deepStrictEqual(getEdgePaths(position, [{ move: 'a3', edge: 0 }]), { red: [], blue: [], impossible: [] });
    });

    it('reports duplicate connections and empty cells', () => {
        assert.deepStrictEqual(getEdgePaths(position, [{ move: 'c3', edge: 0 }, { move: 'c3', edge: 0 }]).impossible, [1]);
        assert.deepStrictEqual(getEdgePaths(position, [{ move: 'c4', edge: 0 }]).impossible, [0]);
    });

    it('refuses a path touching other puzzle cells', () => {
        // Only c1, c2 out of the puzzle: c2 touches b2 and d2, which are not next to c3
        const corridor = { boardsize: 5, redStones: ['c3'] as Move[], blueStones: [], disabledCells: ['c1', 'c2'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(corridor, [{ move: 'c3', edge: 0 }]).impossible, [0]);
        assert.deepStrictEqual(getReachableEdges(corridor, 'c3'), []);

        // Puzzle cells next to c3 can be touched, red could connect them to c3 anyway
        const wide = { ...corridor, disabledCells: ['b1', 'c1', 'd1', 'b2', 'c2', 'd2', 'e2'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(wide, [{ move: 'c3', edge: 0 }]).impossible, []);
    });

    it('touches opponent stones', () => {
        // d2 is the only way, between blue stones c2 and e2
        const between = { boardsize: 5, redStones: ['d3'] as Move[], blueStones: ['a2', 'b2', 'c2', 'e2'] as Move[], disabledCells: ['a1', 'b1', 'c1', 'd1', 'e1', 'd2'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(between, [{ move: 'd3', edge: 0 }]), { red: ['d2', 'd1'], blue: [], impossible: [] });
    });

    it('touches stones connected to the same edge, and their neighbours', () => {
        // b2 and c2 touch a2 and d2, not next to b3
        const touching = { boardsize: 4, redStones: ['b3', 'a2'] as Move[], blueStones: [], disabledCells: ['a1', 'b1', 'c1', 'd1', 'b2', 'c2'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(touching, [{ move: 'b3', edge: 0 }]).impossible, [0]);

        // a2 connected too, b2 can be used: it touches a2
        const paths = getEdgePaths(touching, [{ move: 'b3', edge: 0 }, { move: 'a2', edge: 0 }]);

        assert.deepStrictEqual(paths.impossible, []);
        assert.ok(paths.red.includes('b2'));
        assert.deepStrictEqual(getReachableEdges(touching, 'b3', [{ move: 'a2', edge: 0 }]), [0]);

        // Not when a2 is connected to the other edge
        assert.deepStrictEqual(getEdgePaths(touching, [{ move: 'b3', edge: 0 }, { move: 'a2', edge: 1 }]).impossible, [0, 1]);
    });

    it('shares path between stones connected to the same edge', () => {
        // Only way to top is d2, between blue stones. Both red stones must cross it.
        const narrow = {
            boardsize: 7,
            redStones: ['b5', 'f5'] as Move[],
            blueStones: ['a2', 'b2', 'c2', 'e2', 'f2', 'g2'] as Move[],
            disabledCells: (['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const).flatMap(col => [`${col}1`, `${col}3`, `${col}4`]).concat('d2') as Move[],
        };

        const paths = getEdgePaths(narrow, [{ move: 'b5', edge: 0 }, { move: 'f5', edge: 0 }]);

        assert.deepStrictEqual(paths.impossible, []);
        assert.strictEqual(paths.red.filter(cell => cell === 'd2').length, 1);
        assert.strictEqual(new Set(paths.red).size, paths.red.length);
    });

    it('connects a stone through another stone connected to the same edge', () => {
        // b3 reaches b2, which touches a2, connected to top through a1
        const through = { boardsize: 4, redStones: ['b3', 'a2'] as Move[], blueStones: ['c1'] as Move[], disabledCells: ['a1', 'b2'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(through, [{ move: 'b3', edge: 0 }]).impossible, [0]);

        // b3 first: retried once a2 is connected
        assert.deepStrictEqual(getEdgePaths(through, [{ move: 'b3', edge: 0 }, { move: 'a2', edge: 0 }]), { red: ['a1', 'b2'], blue: [], impossible: [] });
        assert.deepStrictEqual(getReachableEdges(through, 'b3', [{ move: 'a2', edge: 0 }]), [0]);

        // Stone next to a connected stone needs no path
        const next = { ...through, redStones: ['a3', 'a2'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(next, [{ move: 'a3', edge: 0 }, { move: 'a2', edge: 0 }]), { red: ['a1'], blue: [], impossible: [] });
    });

    it('connects the whole group of the stone', () => {
        // c3 has no disabled cell towards top, only through red c2, which can also touch b1 and c1
        const group = { boardsize: 4, redStones: ['c3', 'c2'] as Move[], blueStones: ['b2'] as Move[], disabledCells: ['a1', 'b1', 'c1', 'd1', 'd2'] as Move[] };

        assert.deepStrictEqual(getEdgePaths(group, [{ move: 'c3', edge: 0 }]).impossible, []);
        assert.deepStrictEqual(getReachableEdges(group, 'c3'), [0]);
    });

    it('reports a connection cut by puzzle cells', () => {
        // Row 2 made playable again: c3 cannot reach top anymore
        const cut = { ...position, disabledCells: disabledCells.filter(cell => !cell.endsWith('2')) };

        assert.deepStrictEqual(getEdgePaths(cut, [{ move: 'c3', edge: 0 }]).impossible, [0]);
    });

    it('goes straight to the edge', () => {
        // 19x19, puzzle in last 3 rows
        const cols = 'abcdefghijklmnopqrs'.split('');
        const large = {
            boardsize: 19,
            redStones: ['j17'] as Move[],
            blueStones: [],
            disabledCells: cols.flatMap(col => Array.from({ length: 16 }, (_, row) => `${col}${row + 1}`)) as Move[],
        };

        const { red: path } = getEdgePaths(large, [{ move: 'j17', edge: 0 }]);

        assert.strictEqual(path.length, 16);
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
        const path = getEdgePaths(position, connections).red;

        // Red player: opponent stones, but red path to top
        const win = getSolverFilledPosition(position, connections, 0, 'win');

        assert.deepStrictEqual([...win.redStones].sort(), ['c3', ...path].sort());
        assert.deepStrictEqual([...win.blueStones].sort(), ['a3', ...disabledCells.filter(cell => !path.includes(cell))].sort());

        // Player stones everywhere, path is red anyway
        const notWin = getSolverFilledPosition(position, connections, 0, 'notWin');

        assert.deepStrictEqual([...notWin.redStones].sort(), ['c3', ...disabledCells].sort());
        assert.deepStrictEqual(notWin.blueStones, ['a3']);
    });

    describe('balances stones', () => {
        const around = ({ row, col }: Coords): Move[] => [
            { row, col: col - 1 }, { row, col: col + 1 },
            { row: row - 1, col }, { row: row - 1, col: col + 1 },
            { row: row + 1, col }, { row: row + 1, col: col - 1 },
        ].filter(coords => coords.row >= 0 && coords.col >= 0).map(coordsToMove);

        /**
         * Every switched stone must be enclosed by fill stones, on disabled cells, not on a path.
         */
        const assertSwitchedStonesEnclosed = (switched: Move[], fill: Move[], paths: Move[]): void => {
            for (const move of switched) {
                const neighbours = around(parseMove(move));

                assert.strictEqual(neighbours.length, 6, `${move} on border`);
                assert.ok(neighbours.every(cell => fill.includes(cell) || switched.includes(cell)), `${move} not enclosed`);
                assert.ok(!paths.includes(move) && neighbours.every(cell => !paths.includes(cell)), `${move} next to a path`);
            }
        };

        /**
         * 9x9, playable area is rows 7 to 9, rows 1 to 6 are disabled.
         */
        const bigPosition = {
            boardsize: 9,
            redStones: ['c7', 'e7'] as Move[],
            blueStones: ['a7'] as Move[],
            disabledCells: [1, 2, 3, 4, 5, 6].flatMap(row => 'abcdefghi'.split('').map(col => `${col}${row}` as Move)),
        };

        /**
         * Position filled as sent to solver, then balanced.
         */
        const balanced = (position: EdgeConnectionsPosition, connections: PuzzleEdgeConnection[], playerColor: 0 | 1, claim: SolveClaim) => {
            const edgePaths = getEdgePaths(position, connections);
            const { black, white } = balanceFilledStones(
                fillDisabledCells(position.redStones, position.blueStones, position.disabledCells, playerColor === 0 ? 'black' : 'white', claim, edgePaths),
                position.disabledCells,
                edgePaths,
            );

            return { redStones: black, blueStones: white };
        };

        it('switches enclosed fill stones to the other color', () => {
            const filled = balanced(bigPosition, [], 0, 'win');
            const switched = filled.redStones.filter(move => !bigPosition.redStones.includes(move));

            assert.ok(Math.abs(filled.redStones.length - filled.blueStones.length) <= 1);
            assert.strictEqual(filled.redStones.length + filled.blueStones.length, 57);
            assertSwitchedStonesEnclosed(switched, filled.blueStones, []);

            // Same for blue player proving a win, filled with red
            const blueWin = balanced(bigPosition, [], 1, 'win');

            assert.ok(Math.abs(blueWin.redStones.length - blueWin.blueStones.length) <= 1);
            assertSwitchedStonesEnclosed(blueWin.blueStones.filter(move => !bigPosition.blueStones.includes(move)), blueWin.redStones, []);
        });

        it('does not switch path stones nor stones next to a path', () => {
            // 13x13, playable area is rows 11 to 13
            const tallPosition = {
                boardsize: 13,
                redStones: ['c11', 'e11'] as Move[],
                blueStones: ['a11'] as Move[],
                disabledCells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap(row => 'abcdefghijklm'.split('').map(col => `${col}${row}` as Move)),
            };
            const connections = [{ move: 'c11', edge: 0 } as const, { move: 'e11', edge: 0 } as const];
            const { red: path } = getEdgePaths(tallPosition, connections);
            const filled = balanced(tallPosition, connections, 0, 'win');

            assert.strictEqual(path.length, 20);
            assert.ok(path.every(cell => filled.redStones.includes(cell)));
            assert.ok(Math.abs(filled.redStones.length - filled.blueStones.length) <= 1);
            assertSwitchedStonesEnclosed(filled.redStones.filter(move => !tallPosition.redStones.includes(move) && !path.includes(move)), filled.blueStones, path);

            // Paths leave too few enclosed cells on 9x9: at best
            const tight = balanced(bigPosition, [{ move: 'c7', edge: 0 }, { move: 'e7', edge: 0 }], 0, 'win');

            assert.deepStrictEqual([tight.redStones.length, tight.blueStones.length], [22, 35]);
        });

        it('balances at best when not enough enclosed fill stones', () => {
            // No enclosed disabled cells: row 1 is on border, row 2 is next to puzzle
            const filled = balanced(position, [], 0, 'win');
            const switched = filled.redStones.filter(move => move !== 'c3');

            assert.deepStrictEqual(switched, []);

            const wide = { ...position, boardsize: 5, disabledCells: [...disabledCells, 'a3', 'b3', 'd3', 'e3'] as Move[], blueStones: [] as Move[], redStones: ['c4'] as Move[] };
            const wideFilled = balanced(wide, [], 0, 'win');

            // Only b2 is enclosed, c2 and d2 are next to c3
            assert.deepStrictEqual(wideFilled.redStones, ['c4', 'b2']);
            assertSwitchedStonesEnclosed(['b2'], wideFilled.blueStones, []);
        });

        it('does not switch when already balanced', () => {
            assert.deepStrictEqual(balanceFilledStones({ black: ['a1', 'b1'], white: ['a2', 'b2'] }, []), { black: ['a1', 'b1'], white: ['a2', 'b2'] });

            // Only 1 more red, nothing to switch
            assert.deepStrictEqual(balanceFilledStones({ black: ['d4', 'c3'], white: [] }, ['c3']), { black: ['d4', 'c3'], white: [] });
        });
    });

    describe('fixed fill', () => {
        it('fills fixed cells with their color, whatever the claim', () => {
            const fixed = { ...position, fixedFill: [{ move: 'a1', color: 0 }, { move: 'e1', color: 1 }] as PuzzleFixedFill[] };

            for (const claim of ['win', 'notWin'] as const) {
                const filled = getSolverFilledPosition(fixed, [], 0, claim);

                assert.ok(filled.redStones.includes('a1') && !filled.blueStones.includes('a1'), claim);
                assert.ok(filled.blueStones.includes('e1') && !filled.redStones.includes('e1'), claim);
                assert.strictEqual(filled.redStones.length + filled.blueStones.length, 12, claim);
            }
        });

        it('draws paths around fixed cells', () => {
            const connections = [{ move: 'c3', edge: 0 } as const];
            const aroundC2 = getEdgePaths({ ...position, fixedFill: [{ move: 'c2', color: 1 }] }, connections);

            assert.deepStrictEqual(aroundC2.impossible, []);
            assert.ok(!aroundC2.red.includes('c2'));

            // Both cells between c3 and its edge are fixed blue
            const blocked = { ...position, fixedFill: [{ move: 'c2', color: 1 }, { move: 'd2', color: 1 }] as PuzzleFixedFill[] };

            assert.deepStrictEqual(getEdgePaths(blocked, connections).impossible, [0]);

            // Fixed blue cell is kept blue even when filling with red to prove red does not win
            const filled = getSolverFilledPosition({ ...position, fixedFill: [{ move: 'c2', color: 1 }] }, connections, 0, 'notWin');

            assert.ok(filled.blueStones.includes('c2'));
            assert.ok(aroundC2.red.every(cell => filled.redStones.includes(cell)));
        });

        it('connects through fixed cells of same color', () => {
            // c3 has no disabled cell towards top but c2, fixed red, which can also touch b1 and c1
            const nextToFixed = { boardsize: 4, redStones: ['c3'] as Move[], blueStones: ['b2'] as Move[], disabledCells: ['a1', 'b1', 'c1', 'd1', 'c2'] as Move[], fixedFill: [{ move: 'c2', color: 0 }] as PuzzleFixedFill[] };

            assert.deepStrictEqual(getEdgePaths(nextToFixed, [{ move: 'c3', edge: 0 }]).impossible, []);
            assert.deepStrictEqual(getReachableEdges(nextToFixed, 'c3'), [0]);

            // Not through fixed cells of other color
            const blueFixed = { ...nextToFixed, fixedFill: [{ move: 'c2', color: 1 }] as PuzzleFixedFill[] };

            assert.deepStrictEqual(getEdgePaths(blueFixed, [{ move: 'c3', edge: 0 }]).impossible, [0]);

            // Fixed cell on the way is not part of the path to fill
            const onTheWay = { boardsize: 5, redStones: ['c3'] as Move[], blueStones: [], disabledCells, fixedFill: [{ move: 'c2', color: 0 }, { move: 'd2', color: 0 }] as PuzzleFixedFill[] };
            const { red, impossible } = getEdgePaths(onTheWay, [{ move: 'c3', edge: 0 }]);

            assert.deepStrictEqual(impossible, []);
            assert.ok(!red.includes('c2') && !red.includes('d2'));
        });

        it('does not switch fixed cells when balancing', () => {
            // 9x9, playable area is rows 7 to 9
            const bigPosition = {
                boardsize: 9,
                redStones: ['c7'] as Move[],
                blueStones: ['a7'] as Move[],
                disabledCells: [1, 2, 3, 4, 5, 6].flatMap(row => 'abcdefghi'.split('').map(col => `${col}${row}` as Move)),
            };
            const enclosed = [2, 3, 4, 5].flatMap(row => 'bcdefgh'.split('').map(col => `${col}${row}` as Move));
            const fixedFill = enclosed.map(move => ({ move, color: 1 as const }));
            const { black, white } = balanceFilledStones(
                fillDisabledCells(bigPosition.redStones, bigPosition.blueStones, bigPosition.disabledCells, 'black', 'win', { red: [], blue: [] }, fixedFill),
                bigPosition.disabledCells,
                { red: [], blue: [] },
                fixedFill,
            );

            // All enclosed cells are fixed: nothing to switch
            assert.deepStrictEqual(black, ['c7']);
            assert.ok(enclosed.every(move => white.includes(move)));
        });

        it('validates fixed fill', () => {
            const puzzle: PuzzleDefinition = { ...position, playerColor: 0, tree: { children: [{ move: 'c4' }] } };
            const codes = (fixedFill: unknown) => validatePuzzle({ ...puzzle, fixedFill: fixedFill as PuzzleDefinition['fixedFill'] }).map(error => error.code);

            assert.deepStrictEqual(codes([{ move: 'a1', color: 1 }]), []);
            assert.deepStrictEqual(codes([{ move: 'c3', color: 1 }]), ['fixed_fill_not_disabled']);
            assert.deepStrictEqual(codes([{ move: 'a1', color: 1 }, { move: 'a1', color: 0 }]), ['fixed_fill_twice']);
            assert.deepStrictEqual(codes([{ move: 'a1', color: 2 }]), ['invalid_fixed_fill']);
            assert.deepStrictEqual(codes('a1'), ['invalid_fixed_fill']);
        });
    });
});
