import assert from 'assert';
import { describe, it } from 'mocha';
import { Game, Move, Player } from '..';

describe('Game', () => {
    it('Runs an entire game', () => {
        const game = new Game(3);

        const emitted = {
            started: false,
            played: false,
            ended: false,
        };
        game.on('started', () => emitted['started'] = true);
        game.on('played', () => emitted['played'] = true);
        game.on('ended', () => emitted['ended'] = true);

        assert.strictEqual(game.isStarted(), false);
        assert.strictEqual(game.getSize(), 3);

        game.start();

        assert.strictEqual(emitted['started'], true);

        assert.strictEqual(game.isStarted(), true);

        // Players legal moves
        game.move(new Move(1, 1), 0);
        assert.strictEqual(game.getBoard().getCell(1, 1), 0);

        assert.strictEqual(emitted['played'], true);

        game.move(new Move(1, 2), 1);
        assert.strictEqual(game.getBoard().getCell(1, 2), 1);

        // Illegal moves
        assert.throws(() => game.move(new Move(0, 0), 1), { message: 'Move a1: Not your turn' });
        assert.throws(() => game.move(new Move(9, 0), 0), { message: 'Move a10: Cell outside board' });
        assert.throws(() => game.move(new Move(1, 1), 0), { message: 'Move b2: This cell is already occupied' });

        // Game end
        game.move(new Move(2, 1), 0);
        game.move(new Move(2, 0), 1);
        assert.strictEqual(game.isEnded(), false, 'Game is not yet ended');
        assert.strictEqual(emitted['ended'], false);
        game.move(new Move(0, 1), 0);

        assert.strictEqual(emitted['ended'], true);
        assert.strictEqual(game.isEnded(), true, 'Game is now ended, player 0 won');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner');

        // Cannot move anymore
        assert.throws(() => game.move(new Move(2, 2), 1), { message: 'Move c3: Game is over' });
    });

    it('Runs an entire game from players input', () => {
        const player0 = new Player();
        const player1 = new Player();

        const game = new Game(3, [player0, player1]);

        assert.strictEqual(game.isStarted(), false);
        assert.strictEqual(game.getSize(), 3);

        // Start game
        assert.strictEqual(game.isStarted(), false);
        game.start();
        assert.strictEqual(game.isStarted(), true);

        // Players legal moves
        player0.move(new Move(1, 1));
        assert.strictEqual(game.getBoard().getCell(1, 1), 0);

        player1.move(new Move(1, 2));
        assert.strictEqual(game.getBoard().getCell(1, 2), 1);

        // Illegal moves
        assert.throws(() => player1.move(new Move(0, 0)), { message: 'Move a1: Not your turn' });
        assert.throws(() => player0.move(new Move(9, 0)), { message: 'Move a10: Cell outside board' });
        assert.throws(() => player0.move(new Move(1, 1)), { message: 'Move b2: This cell is already occupied' });

        // Game end
        player0.move(new Move(2, 1));
        player1.move(new Move(2, 0));
        assert.strictEqual(game.isEnded(), false, 'Game is not yet ended');
        player0.move(new Move(0, 1));

        assert.strictEqual(game.isEnded(), true, 'Game is now ended, player 0 won');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner');

        // Cannot move anymore
        assert.throws(() => player0.move(new Move(2, 2)), { message: 'Move c3: Game is over' });
    });

    it('Resign', () => {
        const player0 = new Player();
        const player1 = new Player();

        const game = new Game(3, [player0, player1]);

        game.start();

        // Players legal moves
        player0.move(new Move(1, 1));
        player1.move(new Move(2, 1));

        // Resign
        player1.resign();

        assert.strictEqual(game.isEnded(), true, 'Game is now finished after resign');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner because p1 resigned');
    });

    it('receives well first move if first player plays instantly', () => {
        const player0 = new class extends Player {
            constructor() {
                super();

                this.on('myTurnToPlay', () => {
                    this.move(new Move(1, 1));
                });
            }
        };

        let player1TurnToPlayEventReceived = false;

        const player1 = new class extends Player {
            constructor() {
                super();

                this.on('myTurnToPlay', () => {
                    player1TurnToPlayEventReceived = true;
                });
            }
        };

        const game = new Game(3, [player0, player1]);

        game.start();

        assert.strictEqual(game.getBoard().getCell(1, 1), 0);
        assert.strictEqual(game.getCurrentPlayerIndex(), 1);
        assert.strictEqual(player1TurnToPlayEventReceived, true);
    });

    it('returns whether a move is actually a swap', () => {
        const game = new Game(5);

        game.start();

        assert.strictEqual(game.isSwapPiecesMove(new Move(0, 0), 0), false);

        game.move(new Move(1, 2), 0);

        assert.strictEqual(game.isSwapPiecesMove(new Move(0, 0), 1), false);
        assert.strictEqual(game.isSwapPiecesMove(new Move(1, 2), 1), true);

        game.move(new Move(3, 4), 1);

        assert.strictEqual(game.isSwapPiecesMove(new Move(0, 0), 0), false);
        assert.strictEqual(game.isSwapPiecesMove(new Move(1, 2), 0), false);
        assert.strictEqual(game.isSwapPiecesMove(new Move(3, 4), 0), false);
    });

    it('swap pieces', () => {
        const game = new Game(5);

        game.start();

        game.move(new Move(1, 2), 0);
        game.move(new Move(1, 2), 1);

        assert.strictEqual(game.getBoard().getCell(1, 2), null);
        assert.strictEqual(game.getBoard().getCell(2, 1), 1);
        assert.strictEqual(game.getCurrentPlayerIndex(), 0);
    });

    it('cannot swap pieces if rule has been disabled', () => {
        const game = new Game(5);

        game.setAllowSwap(false);

        game.start();

        game.move(new Move(1, 2), 0);
        assert.throws(() => game.move(new Move(1, 2), 1), { message: 'Move c2: This cell is already occupied' });

        assert.strictEqual(game.getBoard().getCell(1, 2), 0);
        assert.strictEqual(game.getBoard().getCell(2, 1), null);
        assert.strictEqual(game.getCurrentPlayerIndex(), 1);
    });
});
