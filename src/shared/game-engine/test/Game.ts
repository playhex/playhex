import assert from 'assert';
import { describe, it } from 'mocha';
import { Game, Move, Player, SimplePlayer } from '..';

describe('Game', () => {
    it('Runs an entire game', () => {
        const player0 = new SimplePlayer();
        const player1 = new SimplePlayer();

        const game = new Game([player0, player1], 3);

        assert.strictEqual(game.isStarted(), false);
        assert.strictEqual(game.getSize(), 3);

        game.start();

        assert.strictEqual(game.isStarted(), true);

        // Players legal moves
        game.move(new Move(1, 1), 0);
        assert.strictEqual(game.getBoard().getCell(1, 1), 0);

        game.move(new Move(2, 1), 1);
        assert.strictEqual(game.getBoard().getCell(2, 1), 1);

        // Illegal moves
        assert.throws(() => player1.move(new Move(0, 0)), { message: 'Move a1: Not your turn' });
        assert.throws(() => player0.move(new Move(0, 9)), { message: 'Move a10: Cell outside board' });
        assert.throws(() => player0.move(new Move(1, 1)), { message: 'Move b2: This cell is already occupied' });

        // Game end
        game.move(new Move(1, 2), 0);
        game.move(new Move(0, 2), 1);
        assert.strictEqual(game.isEnded(), false, 'Game is not yet ended');
        game.move(new Move(1, 0), 0);

        assert.strictEqual(game.isEnded(), true, 'Game is now ended, player 0 won');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner');

        // Cannot move anymore
        assert.throws(() => game.move(new Move(2, 2), 1), { message: 'Move c3: Game is over' });
    });

    it('Runs an entire game from players input', () => {
        const player0 = new Player();
        const player1 = new Player();

        const game = new Game([player0, player1], 3);

        game.startOnceAllPlayersReady();

        assert.strictEqual(game.isStarted(), false);
        assert.strictEqual(game.getSize(), 3);

        // Players are ready, game starts
        player0.setReady();
        assert.strictEqual(game.isStarted(), false);

        player1.setReady();
        assert.strictEqual(game.isStarted(), true);

        // Players legal moves
        player0.move(new Move(1, 1));
        assert.strictEqual(game.getBoard().getCell(1, 1), 0);

        player1.move(new Move(2, 1));
        assert.strictEqual(game.getBoard().getCell(2, 1), 1);

        // Illegal moves
        assert.throws(() => player1.move(new Move(0, 0)), { message: 'Move a1: Not your turn' });
        assert.throws(() => player0.move(new Move(0, 9)), { message: 'Move a10: Cell outside board' });
        assert.throws(() => player0.move(new Move(1, 1)), { message: 'Move b2: This cell is already occupied' });

        // Game end
        player0.move(new Move(1, 2));
        player1.move(new Move(0, 2));
        assert.strictEqual(game.isEnded(), false, 'Game is not yet ended');
        player0.move(new Move(1, 0));

        assert.strictEqual(game.isEnded(), true, 'Game is now ended, player 0 won');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner');

        // Cannot move anymore
        assert.throws(() => player0.move(new Move(2, 2)), { message: 'Move c3: Game is over' });
    });

    it('Resign', () => {
        const player0 = new Player();
        const player1 = new Player();

        const game = new Game([player0, player1], 3);

        game.startOnceAllPlayersReady();

        // Players are ready, game starts
        player0.setReady();
        player1.setReady();

        // Players legal moves
        player0.move(new Move(1, 1));
        player1.move(new Move(2, 1));

        // Resign
        player1.resign();

        assert.strictEqual(game.isEnded(), true, 'Game is now finished after resign');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner because p1 resigned');
    });
});
