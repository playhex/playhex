import assert from 'assert';
import { describe, it } from 'mocha';
import { Board } from '../../game-engine';

const _ = null;

describe('Board', function () {
    describe('hasConnection', function () {
        it('No connection, missing one', function () {
            const board = new Board(5);

            board.setCell(0, 0, 0);
            board.setCell(0, 1, 0);
            //board.setCell(0, 2, 0);
            board.setCell(0, 3, 0);
            board.setCell(0, 4, 0);

            assert.equal(board.getConnection(), null);
        });

        it('Connection, straight line', function () {
            const board = new Board(5);

            board.setCell(0, 0, 0);
            board.setCell(0, 1, 0);
            board.setCell(0, 2, 0);
            board.setCell(0, 3, 0);
            board.setCell(0, 4, 0);

            assert.equal(board.getConnection(), 0);
        });

        it('No connection, blocked by opponent', function () {
            const board = new Board(5);

            board.setCell(0, 0, 0);
            board.setCell(0, 1, 1);
            board.setCell(0, 2, 0);
            board.setCell(0, 3, 0);
            board.setCell(0, 4, 0);

            assert.equal(board.getConnection(), null);
        });

        it('Connection by player 0', function () {
            const board = Board.createFromGrid([
                [0 , 0 , _ , 1 , _],
                  [_ , _ , 0 , 0 , _],
                    [0 , 0 , _ , 0 , _],
                      [_ , 1 , 0 , _ , _],
                        [_ , _ , 0 , 0 , 0],
            ]);

            assert.equal(board.getConnection(), 0);
        });

        it('Connection by player 1', function () {
            const board = Board.createFromGrid([
                [_ , _ , _ , 1 , _],
                  [_ , _ , _ , 1 , _],
                    [_ , _ , 1 , 1 , 1],
                      [_ , 1 , _ , _ , 1],
                        [_ , _ , _ , _ , 1],
            ]);

            assert.equal(board.getConnection(), 1);
        });

        it('No connection', function () {
            const board = Board.createFromGrid([
                [_ , _ , _ , 1 , _],
                  [_ , _ , _ , 1 , 0],
                    [_ , _ , 1 , _ , 1],
                      [_ , 1 , _ , _ , 1],
                        [0 , _ , _ , _ , 1],
            ]);

            assert.equal(board.getConnection(), null);
        });

        it('No connection, long paths', function () {
            const board = Board.createFromGrid([
                [1 , 1 , _ , 1 , _],
                  [0 , 1 , 0 , 1 , 0],
                    [1 , _ , 1 , _ , 1],
                      [1 , 1 , 1 , 0 , 1],
                        [0 , 0 , 0 , 0 , 1],
            ]);

            assert.equal(board.getConnection(), null);
        });
    });
});
