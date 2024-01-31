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

        assert.strictEqual(link, 'https://hexworld.org/board/#9,e5g6c6i9b3');
    });

    it('generates review link from game having a swap pieces move', () => {
        const game = new Game(9);

        game.move(Move.fromString('b3'), 0);
        game.move(Move.fromString('b3'), 1);
        game.move(Move.fromString('c6'), 0);
        game.move(Move.fromString('i9'), 1);
        game.move(Move.fromString('c4'), 0);

        const link = gameToHexworldLink(game);

        assert.strictEqual(link, 'https://hexworld.org/board/#9,b3:sc6i9c4');
    });
});
