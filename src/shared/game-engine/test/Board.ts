/* eslint-disable indent */
import assert from 'assert';
import { describe, it } from 'mocha';
import { Board, Move } from '../index.js';

const _ = null;

describe('Board', () => {
    describe('getNeighboors', () => {
        it('returns neighboords cells of b2', () => {
            const board = new Board(3);

            const neighboors = board
                .getNeighboors({ row: 1, col: 1 })
                .map(c => new Move(c.row, c.col).toString())
            ;

            assert.strictEqual(neighboors.length, 6);
            assert.ok(neighboors.includes('a2'));
            assert.ok(neighboors.includes('c2'));
            assert.ok(neighboors.includes('b1'));
            assert.ok(neighboors.includes('c1'));
            assert.ok(neighboors.includes('b3'));
            assert.ok(neighboors.includes('a3'));
        });
    });

    describe('getSideCells', () => {
        it('returns side cells of red player', () => {
            const board = new Board(3);

            const topCells = board.getSideCells(0, 0);
            const bottomCells = board.getSideCells(0, 1);

            assert.deepStrictEqual(topCells.map(c => new Move(c.row, c.col).toString()), ['a1', 'b1', 'c1']);
            assert.deepStrictEqual(bottomCells.map(c => new Move(c.row, c.col).toString()), ['a3', 'b3', 'c3']);
        });

        it('returns side cells of blue player', () => {
            const board = new Board(3);

            const topCells = board.getSideCells(1, 0);
            const bottomCells = board.getSideCells(1, 1);

            assert.deepStrictEqual(topCells.map(c => new Move(c.row, c.col).toString()), ['a1', 'a2', 'a3']);
            assert.deepStrictEqual(bottomCells.map(c => new Move(c.row, c.col).toString()), ['c1', 'c2', 'c3']);
        });
    });

    describe('hasConnection', () => {
        it('No connection, missing one', () => {
            const board = new Board(5);

            board.setCell(0, 0, 1);
            board.setCell(0, 1, 1);
            //board.setCell(0, 2, 1);
            board.setCell(0, 3, 1);
            board.setCell(0, 4, 1);

            assert.strictEqual(board.calculateWinner(), null);
        });

        it('Connection, straight line', () => {
            const board = new Board(5);

            board.setCell(0, 0, 1);
            board.setCell(0, 1, 1);
            board.setCell(0, 2, 1);
            board.setCell(0, 3, 1);
            board.setCell(0, 4, 1);

            assert.strictEqual(board.calculateWinner(), 1);
        });

        it('No connection, blocked by opponent', () => {
            const board = new Board(5);

            board.setCell(0, 0, 1);
            board.setCell(0, 1, 0);
            board.setCell(0, 2, 1);
            board.setCell(0, 3, 1);
            board.setCell(0, 4, 1);

            assert.strictEqual(board.calculateWinner(), null);
        });

        it('Connection by player 1', () => {
            const board = Board.createFromGrid([
                [1 , 1 , _ , 0 , _],
                  [_ , _ , 1 , 1 , _],
                    [1 , 1 , _ , 1 , _],
                      [_ , 0 , 1 , _ , _],
                        [_ , _ , 1 , 1 , 1],
            ]);

            assert.strictEqual(board.calculateWinner(), 1);
        });

        it('Connection by player 0', () => {
            const board = Board.createFromGrid([
                [_ , _ , _ , 0 , _],
                  [_ , _ , _ , 0 , _],
                    [_ , _ , 0 , 0 , 0],
                      [_ , 0 , _ , _ , 0],
                        [_ , _ , _ , _ , 0],
            ]);

            assert.strictEqual(board.calculateWinner(), 0);
        });

        it('No connection', () => {
            const board = Board.createFromGrid([
                [_ , _ , _ , 0 , _],
                  [_ , _ , _ , 0 , 1],
                    [_ , _ , 0 , _ , 0],
                      [_ , 0 , _ , _ , 0],
                        [1 , _ , _ , _ , 0],
            ]);

            assert.strictEqual(board.calculateWinner(), null);
        });

        it('No connection, long paths', () => {
            const board = Board.createFromGrid([
                [0 , 0 , _ , 0 , _],
                  [1 , 0 , 1 , 0 , 1],
                    [0 , _ , 0 , _ , 0],
                      [0 , 0 , 0 , 1 , 0],
                        [1 , 1 , 1 , 1 , 0],
            ]);

            assert.strictEqual(board.calculateWinner(), null);
        });
    });

    describe('getShortestWinningPath', () => {
        it('returns shortest path by player 1', () => {
            const board = Board.createFromGrid([
                [1 , 1 , _ , 0 , _],
                  [_ , _ , 1 , 1 , _],
                    [1 , 1 , _ , 1 , _],
                      [_ , 0 , 1 , _ , _],
                        [_ , _ , 1 , 1 , 1],
            ]);

            assert.deepStrictEqual(board.getShortestWinningPath(), [
                { row: 2, col: 0 },
                { row: 2, col: 1 },
                { row: 1, col: 2 },
                { row: 1, col: 3 },
                { row: 2, col: 3 },
                { row: 3, col: 2 },
                { row: 4, col: 2 },
                { row: 4, col: 3 },
                { row: 4, col: 4 },
            ]);
        });

        it('returns shortest path by player 0', () => {
            const board = Board.createFromGrid([
                [_ , _ , _ , 0 , _],
                  [_ , 0 , 0 , 0 , _],
                    [0 , _ , _ , 0 , 0],
                      [0 , 0 , _ , _ , 0],
                        [_ , 0 , _ , _ , 0],
            ]);

            assert.deepStrictEqual(board.getShortestWinningPath(), [
                { row: 0, col: 3 },
                { row: 1, col: 3 },
                { row: 2, col: 3 },
                { row: 2, col: 4 },
                { row: 3, col: 4 },
                { row: 4, col: 4 },
            ]);
        });

        it('returns shortest path, null if no winning path', () => {
            const board = Board.createFromGrid([
                [1 , 1 , 1 , 1 , _],
                  [_ , 0 , 0 , 0 , _],
                    [0 , _ , _ , 0 , 0],
                      [0 , 0 , _ , _ , 0],
                        [_ , 0 , _ , _ , 0],
            ]);

            assert.strictEqual(board.getShortestWinningPath(), null);
        });
    });
});
