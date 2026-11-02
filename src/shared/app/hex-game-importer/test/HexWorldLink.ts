import assert from 'assert';
import { HexWorldLink } from '../handlers/HexWorldLink.js';

describe('HexWorldLink', () => {
    it('supports HexWorld urls and strings', () => {
        assert.strictEqual(new HexWorldLink().supports('https://hexworld.org/board/#11r9c1,b4:sh4g8i8h3g4g3i3j1j3k1i2i1'), true);
        assert.strictEqual(new HexWorldLink().supports('11r9c1,b4:sh4g8i8h3g4g3i3j1j3k1i2i1'), true);
        assert.strictEqual(new HexWorldLink().supports('11,a1'), true);
    });

    it('does not support any source just because it contains a number', () => {
        assert.strictEqual(new HexWorldLink().supports('https://www.littlegolem.net/web/game?id=2566487'), false);
        assert.strictEqual(new HexWorldLink().supports('https://example.com/game/42'), false);
        assert.strictEqual(new HexWorldLink().supports('11'), false);
    });
});
