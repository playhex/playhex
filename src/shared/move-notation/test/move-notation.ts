import assert from 'assert';
import { describe, it } from 'mocha';
import { coordsToMove, mirrorMove, moveToCoords } from '../move-notation.js';

describe('move-notation', () => {
    it('associates well row/col to coords like c2...', () => {
        assert.strictEqual(coordsToMove({ row: 1, col: 2 }), 'c2');
    });

    it('create a Move instance from coords like "c2"', () => {
        assert.strictEqual(coordsToMove(moveToCoords('c2')), 'c2');
        assert.strictEqual(moveToCoords('c2').row, 1);
        assert.strictEqual(moveToCoords('c2').col, 2);
    });

    it('works up to 42', () => {
        assert.strictEqual(coordsToMove({ row: 38, col: 41 }), 'ap39');
    });

    it('returns mirror cell for swap pieces rule', () => {
        assert.strictEqual(mirrorMove('a1'), 'a1');
        assert.strictEqual(mirrorMove('c2'), 'b3');
        assert.strictEqual(mirrorMove('k1'), 'a11');
        assert.strictEqual(mirrorMove('f6'), 'f6');
        assert.strictEqual(mirrorMove('ap39'), 'am42');
    });
});
