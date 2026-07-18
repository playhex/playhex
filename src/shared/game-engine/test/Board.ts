/* eslint-disable indent */
import assert from 'assert';
import { describe, it } from 'mocha';
import { Board } from '../index.js';
import { coordsToMove } from '../../move-notation/move-notation.js';

const _ = null;

describe('Board', () => {
    describe('containsCoords', () => {
        it('accepts cells inside the triangle and rejects the rest', () => {
            const board = new Board(3);

            // On the triangle (row + col <= size - 1)
            assert.ok(board.containsCoords(0, 0));
            assert.ok(board.containsCoords(0, 2));
            assert.ok(board.containsCoords(2, 0));
            assert.ok(board.containsCoords(1, 1));

            // Off the triangle
            assert.ok(!board.containsCoords(2, 1));
            assert.ok(!board.containsCoords(2, 2));
            assert.ok(!board.containsCoords(1, 2));
            assert.ok(!board.containsCoords(-1, 0));

            // Same through containsMove
            assert.ok(board.containsMove('a1'));
            assert.ok(!board.containsMove('c3'));
        });
    });

    describe('getNeighboors', () => {
        it('returns only in-triangle neighboors of b2', () => {
            const board = new Board(3);

            const neighboors = board
                .getNeighboors({ row: 1, col: 1 })
                .map(c => coordsToMove(c))
            ;

            // (1,2) and (2,1) are off the triangle, so 4 neighbours remain
            assert.strictEqual(neighboors.length, 4);
            assert.ok(neighboors.includes('a2')); // (1,0)
            assert.ok(neighboors.includes('b1')); // (0,1)
            assert.ok(neighboors.includes('c1')); // (0,2)
            assert.ok(neighboors.includes('a3')); // (2,0)
        });
    });

    describe('getSideCells', () => {
        it('returns cells of the three triangle sides', () => {
            const board = new Board(3);

            const top = board.getSideCells(0);
            const left = board.getSideCells(1);
            const hypotenuse = board.getSideCells(2);

            assert.deepStrictEqual(top.map(c => coordsToMove(c)), ['a1', 'b1', 'c1']);
            assert.deepStrictEqual(left.map(c => coordsToMove(c)), ['a1', 'a2', 'a3']);
            assert.deepStrictEqual(hypotenuse.map(c => coordsToMove(c)), ['c1', 'b2', 'a3']);
        });
    });

    describe('hasConnection', () => {
        it('Win: a group touching all three sides', () => {
            // Player 1 "Y" shape meeting near the center and reaching each side
            const board = Board.createFromGrid([
                [_ , _ , 1 , _ , _],
                  [1 , 1 , 1 , _ , _],
                    [_ , _ , 1 , _ , _],
                      [_ , _ , _ , _ , _],
                        [_ , _ , _ , _ , _],
            ]);

            assert.strictEqual(board.calculateWinner(), 1);
        });

        it('Win: a full side connects the two other sides at the corners', () => {
            // Whole left column (col 0) links top corner (0,0) and hypotenuse corner (4,0)
            const board = Board.createFromGrid([
                [0 , _ , _ , _ , _],
                  [0 , _ , _ , _ , _],
                    [0 , _ , _ , _ , _],
                      [0 , _ , _ , _ , _],
                        [0 , _ , _ , _ , _],
            ]);

            assert.strictEqual(board.calculateWinner(), 0);
        });

        it('No win: a group touching only two sides', () => {
            // Touches top and left but not the hypotenuse
            const board = Board.createFromGrid([
                [_ , 0 , _ , _ , _],
                  [0 , 0 , _ , _ , _],
                    [_ , _ , _ , _ , _],
                      [_ , _ , _ , _ , _],
                        [_ , _ , _ , _ , _],
            ]);

            assert.strictEqual(board.calculateWinner(), null);
        });

        it('No win: three sides touched, but by two disconnected groups', () => {
            const board = Board.createFromGrid([
                [_ , 0 , _ , _ , _],
                  [0 , _ , _ , _ , _],
                    [_ , _ , 0 , _ , _],
                      [_ , _ , _ , _ , _],
                        [_ , _ , _ , _ , _],
            ]);

            assert.strictEqual(board.calculateWinner(), null);
        });
    });

    describe('getShortestWinningPath', () => {
        it('returns the winning group spanning all three sides', () => {
            const board = Board.createFromGrid([
                [_ , _ , 1 , _ , _],
                  [1 , 1 , 1 , _ , _],
                    [_ , _ , 1 , _ , _],
                      [_ , _ , _ , _ , _],
                        [_ , _ , _ , _ , _],
            ]);

            const path = board.getShortestWinningPath();

            assert.ok(path !== null);
            assert.strictEqual(path.length, 5);

            const moves = path.map(c => coordsToMove(c));

            // Reaches all three sides
            assert.ok(moves.includes(coordsToMove({ row: 0, col: 2 }))); // top
            assert.ok(moves.includes(coordsToMove({ row: 1, col: 0 }))); // left
            assert.ok(moves.includes(coordsToMove({ row: 2, col: 2 }))); // hypotenuse

            // Path starts at the junction where the three legs converge, then fans
            // out toward the sides. For this shape the minimal-total-distance
            // junction is (0, 2), from which the left and hypotenuse legs branch.
            assert.deepStrictEqual(path[0], { row: 0, col: 2 });
        });

        it('returns the minimal Y path, excluding stones off the path', () => {
            // Player 1 wins with the whole left column; the (1,1) stone is a
            // dead-end branch and must not be part of the shortest winning path.
            const board = Board.createFromGrid([
                [1 , _ , _ , _ , _],
                  [1 , 1 , _ , _ , _],
                    [1 , _ , _ , _ , _],
                      [1 , _ , _ , _ , _],
                        [1 , _ , _ , _ , _],
            ]);

            const path = board.getShortestWinningPath();

            assert.ok(path !== null);
            assert.strictEqual(path.length, 5);

            const moves = path.map(c => coordsToMove(c));
            assert.ok(!moves.includes(coordsToMove({ row: 1, col: 1 })), 'dead-end stone excluded');
        });

        it('returns null when there is no winner', () => {
            const board = Board.createFromGrid([
                [_ , 0 , _ , _ , _],
                  [0 , 0 , _ , _ , _],
                    [_ , _ , _ , _ , _],
                      [_ , _ , _ , _ , _],
                        [_ , _ , _ , _ , _],
            ]);

            assert.strictEqual(board.getShortestWinningPath(), null);
        });
    });
});
