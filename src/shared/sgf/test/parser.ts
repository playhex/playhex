import assert from 'assert';
import { sgfFromString } from '../parser.js';

describe('SGF Parser', () => {
    it('generate SGF string from simple SGF object', () => {
        const sgf = sgfFromString('(;FF[4]CA[UTF-8]AP[PlayHex:0.0.0]GM[11]SZ[14]PB[Test]BR[2345]PW[Alcalyn]WR[1500?];B[a1];W[b4];B[d5])');

        assert.strictEqual(sgf.FF, 4);
        assert.strictEqual(sgf.CA, 'UTF-8');
        assert.strictEqual(sgf.AP, 'PlayHex:0.0.0');
        assert.strictEqual(sgf.GM, 11);
        assert.strictEqual(sgf.SZ, 14);
        assert.strictEqual(sgf.PB, 'Test');
        assert.strictEqual(sgf.BR, '2345');
        assert.strictEqual(sgf.PW, 'Alcalyn');
        assert.strictEqual(sgf.WR, '1500?');

        assert.deepStrictEqual(sgf.moves![0].B, 'a1');
        assert.deepStrictEqual(sgf.moves![1].W, 'b4');
        assert.deepStrictEqual(sgf.moves![2].B, 'd5');
    });

    it('keeps all values of list properties', () => {
        const sgf = sgfFromString('(;SZ[5]AB[a1][b2]AW[c3];AE[a1]TR[b2][c3]LB[a1:A][b2:B]PL[W]C[Comment])');

        assert.deepStrictEqual(sgf.AB, ['a1', 'b2']);
        assert.deepStrictEqual(sgf.AW, ['c3']);
        assert.deepStrictEqual(sgf.moves![0].AE, ['a1']);
        assert.deepStrictEqual(sgf.moves![0].TR, ['b2', 'c3']);
        assert.deepStrictEqual(sgf.moves![0].LB, ['a1:A', 'b2:B']);
        assert.strictEqual(sgf.moves![0].PL, 'W');
        assert.strictEqual(sgf.moves![0].C, 'Comment');
    });
});
