import assert from 'assert';
import { ImportUserError } from '../errors.js';
import { LittleGolemSGF } from '../handlers/LittleGolemSGF.js';

const littleGolemSample = '(;FF[4]EV[hex.ch.32.2.1]PB[Bill LeBoeuf]PW[bennok]SZ[13]RE[B]GC[game #1612755]SO[https://www.littlegolem.net];W[am];B[ii];W[de];B[dc];W[bc];B[eh];W[dh];B[di];W[bj];B[dj];W[gh];B[gg];W[if];B[he];W[fh];B[fg];W[ke];B[hg];W[jh];B[ij];W[ih];B[hi];W[hh];B[ig];W[al];B[ci];W[kf];B[resign])';

const regularSgfSample = '(;FF[4]CA[UTF-8]AP[PlayHex:0.0.0]GM[11]SZ[11]PB[Test]PW[Alcalyn];B[f3];W[swap-pieces];B[d4])';

describe('LittleGolemSGF', () => {
    it('supports a Little Golem SGF source', () => {
        assert.strictEqual(new LittleGolemSGF().supports(littleGolemSample), true);
    });

    it('does not support a regular Hex SGF source', () => {
        assert.strictEqual(new LittleGolemSGF().supports(regularSgfSample), false);
    });

    it('imports a Little Golem SGF game', async () => {
        const imported = await new LittleGolemSGF().import(littleGolemSample);

        assert.strictEqual(imported.boardsize, 13);
        assert.strictEqual(imported.playerBlackName, 'Bill LeBoeuf');
        assert.strictEqual(imported.playerWhiteName, 'bennok');

        assert.strictEqual(imported.moves[0], 'a13'); // W[am]
        assert.strictEqual(imported.moves[1], 'i9'); // B[ii]
        assert.strictEqual(imported.moves[imported.moves.length - 1], 'k6'); // W[kf], "resign" must not be pushed as a move
        assert.strictEqual(imported.moves.length, 27);
    });

    it('imports "swap" as a swap-pieces move', async () => {
        const sample = '(;FF[4]SZ[13]RE[B];W[am];B[swap])';
        const imported = await new LittleGolemSGF().import(sample);

        assert.strictEqual(imported.moves[0], 'a13');
        assert.strictEqual(imported.moves[1], 'swap-pieces');
    });

    it('rejects a game that is not finished (no RE)', async () => {
        const sample = '(;FF[4]SZ[13];W[am];B[ii])';

        await assert.rejects(
            () => new LittleGolemSGF().import(sample),
            ImportUserError,
        );
    });
});
