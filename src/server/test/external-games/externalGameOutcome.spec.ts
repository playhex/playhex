import assert from 'assert';
import { describe, it } from 'mocha';
import { findPathWinner } from '../../external-games/externalGameOutcome.js';

describe('externalGameOutcome', () => {
    it('finds player who connected', () => {
        // Player 0 (red, top-bottom) connects a1-a2 on a 2x2 board
        assert.strictEqual(findPathWinner(2, ['a1', 'b1', 'a2']), 0);
    });

    it('returns null when nobody connected', () => {
        assert.strictEqual(findPathWinner(5, ['a1', 'b1']), null);
    });

    it('returns undefined when moves cannot be replayed', () => {
        assert.strictEqual(findPathWinner(5, ['a1', 'a1']), undefined);
    });
});
