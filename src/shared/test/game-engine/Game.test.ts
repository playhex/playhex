import assert from 'assert';
import { describe, it } from 'mocha';
import { Game, Move, PlayerInterface } from '../../game-engine';
import { PlayerData } from '../../game-engine/Types';

const _ = null;
const nullPlayer = new class implements PlayerInterface {
    isReady(): Promise<true>
    {
        throw new Error();
    }
    playMove(): Promise<Move>
    {
        throw new Error();
    }
    toData(): PlayerData
    {
        throw new Error();
    }
};
const players: [PlayerInterface, PlayerInterface] = [nullPlayer, nullPlayer];

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
