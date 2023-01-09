import assert from 'assert';
import { describe, it } from 'mocha';
import { Game, Move, Player } from '..';

/*

const player0 = new Player();
const player1 = new Player();

const game = new Game(player0, player1);

player0.setReady();
player1.setReady(); // game dispatches started event

player0.move(new Move(0, 2)); // game dispatches played event
player0.move(new Move(0, 1)); // nope, throws Illegal move
player1.move(new Move(0, 3));
...
player1.move(new Move(1, 3)); // game dispatches ended event, winner = 1


// or, with chrono
player0.move(new Move(0, 2));
... wait too long
// game dispatches ended event, winner = 0, by timeout

*/

const _ = null;
const players: [Player, Player] = [new Player(), new Player()];

describe('Game', () => {
    describe('hasConnection', () => {
        it('No connection, missing one', () => {
            const game = new Game(players, 5);

            game.setCell(new Move(0, 0), 0);
            game.setCell(new Move(0, 1), 0);
            //game.setCell(new Move(0, 2), 0);
            game.setCell(new Move(0, 3), 0);
            game.setCell(new Move(0, 4), 0);

            assert.strictEqual(game.calculateWinner(), null);
        });

        it('Connection, straight line', () => {
            const game = new Game(players, 5);

            game.setCell(new Move(0, 0), 0);
            game.setCell(new Move(0, 1), 0);
            game.setCell(new Move(0, 2), 0);
            game.setCell(new Move(0, 3), 0);
            game.setCell(new Move(0, 4), 0);

            assert.strictEqual(game.calculateWinner(), 0);
        });

        it('No connection, blocked by opponent', () => {
            const game = new Game(players, 5);

            game.setCell(new Move(0, 0), 0);
            game.setCell(new Move(0, 1), 1);
            game.setCell(new Move(0, 2), 0);
            game.setCell(new Move(0, 3), 0);
            game.setCell(new Move(0, 4), 0);

            assert.strictEqual(game.calculateWinner(), null);
        });

        it('Connection by player 0', () => {
            const game = Game.createFromGrid(players, [
                [0 , 0 , _ , 1 , _],
                  [_ , _ , 0 , 0 , _],
                    [0 , 0 , _ , 0 , _],
                      [_ , 1 , 0 , _ , _],
                        [_ , _ , 0 , 0 , 0],
            ]);

            assert.strictEqual(game.calculateWinner(), 0);
        });

        it('Connection by player 1', () => {
            const game = Game.createFromGrid(players, [
                [_ , _ , _ , 1 , _],
                  [_ , _ , _ , 1 , _],
                    [_ , _ , 1 , 1 , 1],
                      [_ , 1 , _ , _ , 1],
                        [_ , _ , _ , _ , 1],
            ]);

            assert.strictEqual(game.calculateWinner(), 1);
        });

        it('No connection', () => {
            const game = Game.createFromGrid(players, [
                [_ , _ , _ , 1 , _],
                  [_ , _ , _ , 1 , 0],
                    [_ , _ , 1 , _ , 1],
                      [_ , 1 , _ , _ , 1],
                        [0 , _ , _ , _ , 1],
            ]);

            assert.strictEqual(game.calculateWinner(), null);
        });

        it('No connection, long paths', () => {
            const game = Game.createFromGrid(players, [
                [1 , 1 , _ , 1 , _],
                  [0 , 1 , 0 , 1 , 0],
                    [1 , _ , 1 , _ , 1],
                      [1 , 1 , 1 , 0 , 1],
                        [0 , 0 , 0 , 0 , 1],
            ]);

            assert.strictEqual(game.calculateWinner(), null);
        });
    });

    describe('getShortestWinningPath', () => {
        it('returns shortest path by player 0', () => {
            const game = Game.createFromGrid(players, [
                [0 , 0 , _ , 1 , _],
                  [_ , _ , 0 , 0 , _],
                    [0 , 0 , _ , 0 , _],
                      [_ , 1 , 0 , _ , _],
                        [_ , _ , 0 , 0 , 0],
            ]);

            assert.deepStrictEqual(game.getShortestWinningPath(), [
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
            const game = Game.createFromGrid(players, [
                [_ , _ , _ , 1 , _],
                  [_ , 1 , 1 , 1 , _],
                    [1 , _ , _ , 1 , 1],
                      [1 , 1 , _ , _ , 1],
                        [_ , 1 , _ , _ , 1],
            ]);

            assert.deepStrictEqual(game.getShortestWinningPath(), [
                { row: 0, col: 3 },
                { row: 1, col: 3 },
                { row: 2, col: 3 },
                { row: 2, col: 4 },
                { row: 3, col: 4 },
                { row: 4, col: 4 },
            ]);
        });

        it('returns shortest path, null if no winning path', () => {
            const game = Game.createFromGrid(players, [
                [0 , 0 , 0 , 0 , _],
                  [_ , 1 , 1 , 1 , _],
                    [1 , _ , _ , 1 , 1],
                      [1 , 1 , _ , _ , 1],
                        [_ , 1 , _ , _ , 1],
            ]);

            assert.strictEqual(game.getShortestWinningPath(), null);
        });
    });
});
