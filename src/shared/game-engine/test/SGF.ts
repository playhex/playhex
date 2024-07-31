import assert from 'assert';
import { describe, it } from 'mocha';
import { Game, Move } from '..';
import { gameToSGF } from '../SGF';

describe('SGF', () => {
    it('Generates SGF string for a Game', () => {
        const game = new Game(4);

        game.move(new Move(0, 0), 0);
        game.move(new Move(0, 1), 1);
        game.move(new Move(2, 2), 0);

        game.setStartedAt(new Date('2023-12-08 12:00:00'));

        assert.strictEqual(
            gameToSGF(game, {
                PB: 'Player A',
                PW: 'Player B',
            }),
            '(;FF[4]GM[11]AP[PlayHex:0.0.0]PL[B]SZ[4]DT[2023-12-08]PB[Player A]PW[Player B];B[a1];W[b1];B[c3])',
        );
    });

    it('Generates SGF string for a Game won by resignation', () => {
        const game = new Game(4);

        game.move(new Move(0, 0), 0);
        game.move(new Move(0, 1), 1);
        game.move(new Move(2, 2), 0);

        game.declareWinner(0, 'resign', new Date());

        game.setStartedAt(new Date('2023-12-08 12:00:00'));

        assert.strictEqual(
            gameToSGF(game, {
                PB: 'Player A',
                PW: 'Player B',
            }),
            '(;FF[4]GM[11]AP[PlayHex:0.0.0]PL[B]SZ[4]DT[2023-12-08]PB[Player A]PW[Player B]RE[B+Resign];B[a1];W[b1];B[c3])',
        );
    });

    it('Generates SGF string for a canceled Game', () => {
        const game = new Game(4);

        game.cancel(new Date());

        game.setStartedAt(new Date('2023-12-08 12:00:00'));

        assert.strictEqual(
            gameToSGF(game, {
                PB: 'Player A',
                PW: 'Player B',
            }),
            '(;FF[4]GM[11]AP[PlayHex:0.0.0]PL[B]SZ[4]DT[2023-12-08]PB[Player A]PW[Player B]RE[Void];)',
        );
    });

    it('Generates SGF string for a game with a swap move', () => {
        const game = new Game(4);

        game.move(new Move(1, 2), 0);
        game.move(Move.swapPieces(), 1);
        game.move(new Move(0, 3), 0);

        game.setStartedAt(new Date('2023-12-08 12:00:00'));

        assert.strictEqual(
            gameToSGF(game, {
                PB: 'Player A',
                PW: 'Player B',
            }),
            '(;FF[4]GM[11]AP[PlayHex:0.0.0]PL[B]SZ[4]DT[2023-12-08]PB[Player A]PW[Player B];B[c2];W[swap-pieces];B[d1])',
        );
    });

    it('Generates SGF string for a game with pass moves', () => {
        const game = new Game(4);

        game.move(new Move(1, 2), 0);
        game.move(Move.pass(), 1);
        game.move(new Move(0, 3), 0);
        game.move(new Move(1, 3), 1);
        game.move(Move.pass(), 0);
        game.move(new Move(2, 3), 1);

        game.setStartedAt(new Date('2023-12-08 12:00:00'));

        assert.strictEqual(
            gameToSGF(game, {
                PB: 'Player A',
                PW: 'Player B',
            }),
            '(;FF[4]GM[11]AP[PlayHex:0.0.0]PL[B]SZ[4]DT[2023-12-08]PB[Player A]PW[Player B];B[c2];W[pass];B[d1];W[d2];B[pass];W[d3])',
        );
    });

    it('Generates SGF string for a game with both pass and swap', () => {
        const game = new Game(4);

        game.move(new Move(0, 0), 0);
        game.move(Move.swapPieces(), 1);
        game.move(Move.pass(), 0);
        game.move(new Move(1, 0), 1);

        game.setStartedAt(new Date('2023-12-08 12:00:00'));

        assert.strictEqual(
            gameToSGF(game, {
                PB: 'Player A',
                PW: 'Player B',
            }),
            '(;FF[4]GM[11]AP[PlayHex:0.0.0]PL[B]SZ[4]DT[2023-12-08]PB[Player A]PW[Player B];B[a1];W[swap-pieces];B[pass];W[a2])',
        );
    });
});
