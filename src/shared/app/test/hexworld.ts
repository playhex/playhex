/* eslint-disable @typescript-eslint/no-explicit-any */
import { gameToHexworldLink } from '../hexworld';
import { Game, Move } from '../../game-engine';
import { describe, it } from 'mocha';
import assert from 'assert';

describe('hexworld', () => {
    it('generates review link from game', () => {
        const game = new Game(9);

        game.move(Move.fromString('e5'), 0);
        game.move(Move.fromString('g6'), 1);
        game.move(Move.fromString('c6'), 0);
        game.move(Move.fromString('i9'), 1);
        game.move(Move.fromString('b3'), 0);

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,e5g6c6i9b3');
    });

    it('generates review link from game having a swap pieces move', () => {
        const game = new Game(9);

        game.move(Move.fromString('b3'), 0);
        game.move(Move.fromString('swap-pieces'), 1);
        game.move(Move.fromString('c6'), 0);
        game.move(Move.fromString('i9'), 1);
        game.move(Move.fromString('c4'), 0);

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,b3:sc6i9c4');
    });

    it('generates review link from game having a pass move', () => {
        const game = new Game(9);

        game.move(Move.fromString('b3'), 0);
        game.move(Move.fromString('swap-pieces'), 1);
        game.move(Move.fromString('c6'), 0);
        game.move(Move.fromString('i9'), 1);
        game.move(Move.fromString('pass'), 0);

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,b3:sc6i9:p');
    });

    it('generates review link from a resigned game', () => {
        const game = new Game(9);

        game.move(Move.fromString('b3'), 0);
        game.move(Move.fromString('swap-pieces'), 1);
        game.move(Move.fromString('c6'), 0);
        game.resign(1, new Date());

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9r9c1,b3:sc6:rw');
    });

    it('generates review link from a timed out game', () => {
        const game = new Game(11);

        game.move(Move.fromString('b3'), 0);
        game.move(Move.fromString('c11'), 1);
        game.loseByTime(new Date());

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#11r9c1,b3c11:fb');
    });

    it('generates a review link for the "Flat" board rotation', () => {
        const game = new Game(11);
        game.move(Move.fromString('c2'), 0);
        game.move(Move.fromString('d4'), 1);
        game.move(Move.fromString('c6'), 0);
        game.resign(1, new Date());

        const link = gameToHexworldLink(game, 0);

        assert.strictEqual(link, 'https://hexworld.org/board/#11c1,c2d4c6:rw');
    });
});
