import assert from 'assert';
import { describe, it } from 'mocha';
import { Board } from '..';

const _ = null;

describe('Board', () => {
    describe('hasConnection', () => {
        it('No connection, missing one', () => {
            const board = new Board(5);

            board.setCell(0, 0, 0);
            board.setCell(0, 1, 0);
            //board.setCell(0, 2, 0);
            board.setCell(0, 3, 0);
            board.setCell(0, 4, 0);

            assert.strictEqual(board.calculateWinner(), null);
        });

        it('Connection, straight line', () => {
            const board = new Board(5);

            board.setCell(0, 0, 0);
            board.setCell(0, 1, 0);
            board.setCell(0, 2, 0);
            board.setCell(0, 3, 0);
            board.setCell(0, 4, 0);

            assert.strictEqual(board.calculateWinner(), 0);
        });

        it('No connection, blocked by opponent', () => {
            const board = new Board(5);

            board.setCell(0, 0, 0);
            board.setCell(0, 1, 1);
            board.setCell(0, 2, 0);
            board.setCell(0, 3, 0);
            board.setCell(0, 4, 0);

            assert.strictEqual(board.calculateWinner(), null);
        });

        it('Connection by player 0', () => {
            const board = Board.createFromGrid([
                [0 , 0 , _ , 1 , _],
                  [_ , _ , 0 , 0 , _],
                    [0 , 0 , _ , 0 , _],
                      [_ , 1 , 0 , _ , _],
                        [_ , _ , 0 , 0 , 0],
            ]);

            assert.strictEqual(board.calculateWinner(), 0);
        });

        it('Connection by player 1', () => {
            const board = Board.createFromGrid([
                [_ , _ , _ , 1 , _],
                  [_ , _ , _ , 1 , _],
                    [_ , _ , 1 , 1 , 1],
                      [_ , 1 , _ , _ , 1],
                        [_ , _ , _ , _ , 1],
            ]);

            assert.strictEqual(board.calculateWinner(), 1);
        });

        it('No connection', () => {
            const board = Board.createFromGrid([
                [_ , _ , _ , 1 , _],
                  [_ , _ , _ , 1 , 0],
                    [_ , _ , 1 , _ , 1],
                      [_ , 1 , _ , _ , 1],
                        [0 , _ , _ , _ , 1],
            ]);

            assert.strictEqual(board.calculateWinner(), null);
        });

        it('No connection, long paths', () => {
            const board = Board.createFromGrid([
                [1 , 1 , _ , 1 , _],
                  [0 , 1 , 0 , 1 , 0],
                    [1 , _ , 1 , _ , 1],
                      [1 , 1 , 1 , 0 , 1],
                        [0 , 0 , 0 , 0 , 1],
            ]);

            assert.strictEqual(board.calculateWinner(), null);
        });
    });

    describe('getShortestWinningPath', () => {
        it('returns shortest path by player 0', () => {
            const board = Board.createFromGrid([
                [0 , 0 , _ , 1 , _],
                  [_ , _ , 0 , 0 , _],
                    [0 , 0 , _ , 0 , _],
                      [_ , 1 , 0 , _ , _],
                        [_ , _ , 0 , 0 , 0],
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

        it('returns shortest path by player 1', () => {
            const board = Board.createFromGrid([
                [_ , _ , _ , 1 , _],
                  [_ , 1 , 1 , 1 , _],
                    [1 , _ , _ , 1 , 1],
                      [1 , 1 , _ , _ , 1],
                        [_ , 1 , _ , _ , 1],
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
                [0 , 0 , 0 , 0 , _],
                  [_ , 1 , 1 , 1 , _],
                    [1 , _ , _ , 1 , 1],
                      [1 , 1 , _ , _ , 1],
                        [_ , 1 , _ , _ , 1],
            ]);

            assert.strictEqual(board.getShortestWinningPath(), null);
        });
    });
});
