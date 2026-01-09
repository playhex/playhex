import assert from 'assert';
import { describe, it } from 'mocha';
import { Game } from '../index.js';
import { coordsToMove } from '../../move-notation/move-notation.js';

describe('Game', () => {
    it('Runs an entire game', () => {
        const game = new Game(3);

        const emitted = {
            played: false,
            ended: false,
        };
        game.on('played', () => emitted['played'] = true);
        game.on('ended', () => emitted['ended'] = true);

        assert.strictEqual(game.getSize(), 3);

        // Players legal moves
        game.move('b2', 0);
        assert.strictEqual(game.getBoard().getCell('b2'), 0);
        assert.strictEqual(game.getLastMoveIndex(), 0);

        assert.strictEqual(emitted['played'], true);

        game.move('c2', 1);
        assert.strictEqual(game.getBoard().getCell('c2'), 1);
        assert.strictEqual(game.getLastMoveIndex(), 1);

        // Illegal moves
        assert.throws(() => game.move('a1', 1), { message: 'Move a1: Not your turn' });
        assert.throws(() => game.move('a10', 0), { message: 'Move a10: Cell outside board' });
        assert.throws(() => game.move('b2', 0), { message: 'Move b2: This cell is already occupied' });

        // Game end
        game.move('b3', 0);
        game.move('a3', 1);
        assert.strictEqual(game.isEnded(), false, 'Game is not yet ended');
        assert.strictEqual(emitted['ended'], false);
        game.move('b1', 0);

        assert.strictEqual(emitted['ended'], true);
        assert.strictEqual(game.isEnded(), true, 'Game is now ended, player 0 won');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner');

        // Cannot move anymore
        assert.throws(() => game.move('c3', 1), { message: 'Move c3: Game is finished' });
    });

    it('Resign', () => {
        const game = new Game(3);

        // Players legal moves
        game.move('b2', 0);
        game.move('b3', 1);

        // Resign
        game.resign(1, new Date());

        assert.strictEqual(game.isEnded(), true, 'Game is now finished after resign');
        assert.strictEqual(game.getStrictWinner(), 0, 'Player 0 is the winner because p1 resigned');
    });

    it('swap pieces', () => {
        const game = new Game(5);

        game.move('c2', 0);
        game.move('swap-pieces', 1);

        assert.strictEqual(game.getBoard().getCell('c2'), null);
        assert.strictEqual(game.getBoard().getCell('b3'), 1);
        assert.strictEqual(game.getCurrentPlayerIndex(), 0);
    });

    it('cannot swap pieces if rule has been disabled', () => {
        const game = new Game(5);

        game.setAllowSwap(false);

        game.move('c2', 0);
        assert.throws(() => game.move('swap-pieces', 1), { message: 'Move swap-pieces: Cannot swap, swap rule is disabled' });

        assert.strictEqual(game.getBoard().getCell('c2'), 0);
        assert.strictEqual(game.getBoard().getCell('b3'), null);
        assert.strictEqual(game.getCurrentPlayerIndex(), 1);
    });

    it('cannot swap pieces in the middle of the game', () => {
        const game = new Game(5);

        game.move('a1', 0);
        game.move('b2', 1);

        assert.throws(() => game.move('swap-pieces', 0), { message: 'Move swap-pieces: Cannot swap now' });
    });

    it('cannot swap twice', () => {
        const game = new Game(5);

        game.move('a1', 0);
        game.move('swap-pieces', 1);
        assert.throws(() => game.move('swap-pieces', 0), { message: 'Move swap-pieces: Cannot swap now' });
    });

    it('recreate a playing Game from raw data object', () => {
        const game = new Game(5);

        game.setAllowSwap(false);

        game.move('c2', 0);
        game.move('b4', 1);

        const gameData = game.toData();

        assert.strictEqual(gameData.size, 5);
        assert.strictEqual(gameData.movesHistory.length, 2);
        assert.ok(gameData.movesHistory[0].playedAt instanceof Date);


        const restoredGame = Game.fromData(gameData);

        assert.strictEqual(game.getSize(), restoredGame.getSize());
        assert.strictEqual(game.getMovesHistory().length, restoredGame.getMovesHistory().length);
        assert.strictEqual(game.getMovesHistory()[0].playedAt.toISOString(), restoredGame.getMovesHistory()[0].playedAt.toISOString());
        assert.strictEqual(game.getStartedAt(), restoredGame.getStartedAt());
        assert.strictEqual(game.getLastMoveAt(), restoredGame.getLastMoveAt());
        assert.strictEqual(game.isEnded(), restoredGame.isEnded());
    });

    it('recreate a resigned Game from raw data object', () => {
        const game = new Game(5);

        game.setAllowSwap(false);

        game.move('c2', 0);
        game.move('b4', 1);

        game.resign(0, new Date());

        const gameData = game.toData();
        const restoredGame = Game.fromData(gameData);

        assert.strictEqual(game.getWinner(), restoredGame.getWinner());
        assert.strictEqual(game.getOutcome(), restoredGame.getOutcome());
        assert.strictEqual(game.isEnded(), restoredGame.isEnded());
    });

    it('recreate a canceled Game from raw data object', () => {
        const game = new Game(5);

        game.setAllowSwap(false);

        game.move('c2', 0);
        game.move('b4', 1);

        game.cancel(new Date());

        const gameData = game.toData();
        const restoredGame = Game.fromData(gameData);

        assert.strictEqual(game.getWinner(), restoredGame.getWinner());
        assert.strictEqual(game.getOutcome(), restoredGame.getOutcome());
        assert.strictEqual(game.isEnded(), restoredGame.isEnded());
        assert.strictEqual(game.isCanceled(), restoredGame.isCanceled());
    });

    it('recreates a won game from raw data object', () => {
        const game = new Game(3);

        game.move('b2', 0);
        game.move('c2', 1);
        game.move('b3', 0);
        game.move('a3', 1);
        game.move('b1', 0);

        const gameData = game.toData();
        const restoredGame = Game.fromData(gameData);

        assert.strictEqual(game.getWinner(), restoredGame.getWinner());
        assert.strictEqual(game.getOutcome(), restoredGame.getOutcome());
        assert.strictEqual(game.isEnded(), restoredGame.isEnded());
        assert.strictEqual(game.getEndedAt(), restoredGame.getEndedAt());
        assert.strictEqual(game.isCanceled(), restoredGame.isCanceled());
    });

    it('provides consistent timestamping', () => {
        const game = new Game(3);

        let lastMoveAt: null | Date = null;
        let lastEndedAt: null | Date = null;

        game.on('played', move => lastMoveAt = move.playedAt);
        game.on('ended', (winner, outcome, date) => lastEndedAt = date);

        const firstMoveDate = new Date();

        // Players legal moves
        game.move(coordsToMove({ row: 1, col: 1 }), 0, firstMoveDate);

        assert.strictEqual(lastMoveAt, firstMoveDate);

        // Game end
        game.move('c2', 1);
        game.move('b3', 0);
        game.move('a3', 1);
        const lastMoveDate = new Date();
        game.move('b1', 0, lastMoveDate);

        assert.strictEqual(lastEndedAt, lastMoveDate);
        assert.strictEqual(game.getLastMoveAt(), lastMoveDate);
        assert.strictEqual(game.getEndedAt(), lastMoveDate);
    });

    describe('Undo move', () => {
        it('undo simple move', () => {
            const game = new Game(3);

            game.move('a1', 0);
            game.move('b2', 1);
            game.move('c3', 0);

            game.undoMove();

            assert.strictEqual(game.getMovesHistory().length, 2);
            assert.strictEqual(game.getLastMove()?.move, 'b2');
            assert.strictEqual(game.getCurrentPlayerIndex(), 0);

            assert.strictEqual(game.getBoard().getCell('a1'), 0);
            assert.strictEqual(game.getBoard().getCell('b2'), 1);
            assert.strictEqual(game.getBoard().getCell('c3'), null);
        });

        it('undo swap move', () => {
            const game = new Game(3);

            game.move('a2', 0);
            game.move('swap-pieces', 1);

            game.undoMove();

            assert.strictEqual(game.getMovesHistory().length, 1);
            assert.strictEqual(game.getLastMove()?.move, 'a2');
            assert.strictEqual(game.getCurrentPlayerIndex(), 1);

            assert.strictEqual(game.getBoard().getCell('a2'), 0);
            assert.strictEqual(game.getBoard().getCell('b1'), null);
        });

        it('player undo move', () => {
            const game = new Game(5);

            game.move('a1', 0);
            game.move('b2', 1);
            game.move('c3', 0);

            game.playerUndo(0);

            assert.strictEqual(game.getMovesHistory().length, 2);
            assert.strictEqual(game.getLastMove()?.move, 'b2');
            assert.strictEqual(game.getCurrentPlayerIndex(), 0);

            assert.strictEqual(game.getBoard().getCell('a1'), 0);
            assert.strictEqual(game.getBoard().getCell('b2'), 1);
            assert.strictEqual(game.getBoard().getCell('c3'), null);
        });

        it('player undo move after opponent played', () => {
            const game = new Game(5);

            game.move('a1', 0);
            game.move('b2', 1);
            game.move('c3', 0);
            game.move('d4', 1);

            game.playerUndo(0);

            assert.strictEqual(game.getMovesHistory().length, 2);
            assert.strictEqual(game.getLastMove()?.move, 'b2');
            assert.strictEqual(game.getCurrentPlayerIndex(), 0);

            assert.strictEqual(game.getBoard().getCell('a1'), 0);
            assert.strictEqual(game.getBoard().getCell('b2'), 1);
            assert.strictEqual(game.getBoard().getCell('c3'), null);
            assert.strictEqual(game.getBoard().getCell('d4'), null);
        });

        it('player undo his swap move after opponent played', () => {
            const game = new Game(3);

            game.move('a2', 0);
            game.move('swap-pieces', 1);
            game.move('c3', 0);

            game.playerUndo(1);

            assert.strictEqual(game.getMovesHistory().length, 1);
            assert.strictEqual(game.getLastMove()?.move, 'a2');
            assert.strictEqual(game.getCurrentPlayerIndex(), 1);

            assert.strictEqual(game.getBoard().getCell('a2'), 0);
            assert.strictEqual(game.getBoard().getCell('b1'), null);
            assert.strictEqual(game.getBoard().getCell('c3'), null);
        });

        it('player undo dry run', () => {
            const game = new Game(3);

            game.move('a2', 0);
            game.move('swap-pieces', 1);
            game.move('c3', 0);

            const moves = game.playerUndoDryRun(1);

            assert.strictEqual(moves.length, 2);
            assert.ok(moves[0].move === game.getLastMove()?.move);
            assert.ok(moves[1].move === game.getMovesHistory()[game.getMovesHistory().length - 2].move);
        });
    });

    describe('Pass', () => {
        it('passes', () => {
            const game = new Game(3);

            game.move('a1', 0);
            game.move('a2', 1);
            game.move('a3', 0);
            game.move('pass', 1);

            assert.strictEqual(game.getCurrentPlayerIndex(), 0);
            assert.strictEqual(game.getLastMoveIndex(), 3);
        });

        it('passes on first move, then we cannot pass a swap move', () => {
            const game = new Game(3);

            game.move('pass', 0);

            assert.strictEqual(game.getCurrentPlayerIndex(), 1);
            assert.strictEqual(game.canSwapNow(), false);

            assert.throws(() => game.checkMove('swap-pieces', 1), { message: 'Move swap-pieces: Cannot swap now' });
        });

        it('passes on second move', () => {
            const game = new Game(3);

            game.move('c2', 0);
            game.move('pass', 1);

            assert.strictEqual(game.getCurrentPlayerIndex(), 0);
            assert.strictEqual(game.canSwapNow(), false);

            assert.throws(() => game.checkMove('swap-pieces', 0), { message: 'Move swap-pieces: Cannot swap now' });
        });

        it('passes twice', () => {
            const game = new Game(3);

            game.move('pass', 0);
            game.move('pass', 1);

            assert.strictEqual(game.getCurrentPlayerIndex(), 0);
            assert.strictEqual(game.canSwapNow(), false);
        });

        it('passes after swap move', () => {
            const game = new Game(3);

            game.move('c2', 0);
            game.move('swap-pieces', 1);
            game.move('pass', 0);

            assert.strictEqual(game.getCurrentPlayerIndex(), 1);
            assert.strictEqual(game.canSwapNow(), false);
        });
    });
});
