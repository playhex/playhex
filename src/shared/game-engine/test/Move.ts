import assert from 'assert';
import { describe, it } from 'mocha';
import { Move } from '..';

describe('Move', () => {
    it('associates well row/col to coords like c2...', () => {
        assert.strictEqual(new Move(1, 2).toString(), 'c2');
    });
});
