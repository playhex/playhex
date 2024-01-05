import assert from 'assert';
import { describe, it } from 'mocha';
import { Move } from '..';

describe('Move', () => {
    it('associates well row/col to coords like c2...', () => {
        assert.strictEqual(new Move(1, 2).toString(), 'c2');
    });

    it('create a Move instance from coords like "c2"', () => {
        assert.strictEqual(Move.fromString('c2').toString(), 'c2');
        assert.strictEqual(Move.fromString('c2').row, 1);
        assert.strictEqual(Move.fromString('c2').col, 2);
    });

    it('works up to 42', () => {
        assert.strictEqual(new Move(38, 41).toString(), 'ap39');
    });

    it('returns mirror cell for swap pieces rule', () => {
        assert.strictEqual(Move.fromString('a1').cloneMirror().toString(), 'a1');
        assert.strictEqual(Move.fromString('c2').cloneMirror().toString(), 'b3');
        assert.strictEqual(Move.fromString('k1').cloneMirror().toString(), 'a11');
        assert.strictEqual(Move.fromString('f6').cloneMirror().toString(), 'f6');
        assert.strictEqual(Move.fromString('ap39').cloneMirror().toString(), 'am42');
    });
});
