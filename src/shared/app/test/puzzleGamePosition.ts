import assert from 'assert';
import { describe, it } from 'mocha';
import { getGamePosition } from '../puzzles/gamePosition.js';

describe('puzzle gamePosition', () => {
    it('gets position after n moves', () => {
        const game = { boardsize: 5, swapRule: false, moves: ['c3', 'b2', 'd4', 'a1'] as const };

        assert.deepStrictEqual(getGamePosition({ ...game, moves: [...game.moves] }, 0), {
            boardsize: 5, redStones: [], blueStones: [], lastMove: null, playerColor: 0,
        });

        const position = getGamePosition({ ...game, moves: [...game.moves] }, 3);

        assert.deepStrictEqual(position.redStones.sort(), ['c3', 'd4']);
        assert.deepStrictEqual(position.blueStones, ['b2']);
        assert.strictEqual(position.lastMove, 'd4');
        assert.strictEqual(position.playerColor, 1);
    });

    it('handles swap', () => {
        const position = getGamePosition({ boardsize: 5, swapRule: true, moves: ['b4', 'swap-pieces'] }, 2);

        assert.deepStrictEqual(position.redStones, []);
        assert.deepStrictEqual(position.blueStones, ['d2']);
        assert.strictEqual(position.lastMove, 'd2');
        assert.strictEqual(position.playerColor, 0);
    });

    it('handles pass', () => {
        const position = getGamePosition({ boardsize: 5, swapRule: false, moves: ['c3', 'pass'] }, 2);

        assert.deepStrictEqual(position.redStones, ['c3']);
        assert.strictEqual(position.lastMove, null);
        assert.strictEqual(position.playerColor, 0);
    });
});
