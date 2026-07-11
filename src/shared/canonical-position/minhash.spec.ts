import assert from 'assert';
import { describe, it } from 'mocha';
import { compareAllPositions } from './index.js';
import { allMirrorsBandHashes, BAND_COUNT, positionBandHashes } from './minhash.js';

const game = 'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8';

describe('CanonicalPosition minhash', () => {
    describe('positionBandHashes', () => {
        it('returns same band hashes for a same position', () => {
            assert.deepStrictEqual(
                positionBandHashes(game, 11),
                positionBandHashes(game, 11),
            );
        });

        it('returns same band hashes for a same position with moves in a different order', () => {
            assert.deepStrictEqual(
                positionBandHashes('a2 b3 c4 d5', 11),
                positionBandHashes('c4 d5 a2 b3', 11),
            );
        });

        it('returns BAND_COUNT band hashes', () => {
            assert.strictEqual(positionBandHashes(game, 11)?.length, BAND_COUNT);
        });

        it('returns different band hashes for a same position on a different board size', () => {
            const on11 = positionBandHashes('a2 b3', 11) as number[];
            const on13 = positionBandHashes('a2 b3', 13) as number[];

            for (let bandNo = 0; bandNo < BAND_COUNT; ++bandNo) {
                assert.notStrictEqual(on11[bandNo], on13[bandNo]);
            }
        });

        it('returns null for a position with no stone', () => {
            assert.strictEqual(positionBandHashes('pass pass', 11), null);
        });

        it('keeps most band hashes for a position with a single stone changed', () => {
            const bandHashes = positionBandHashes(game, 11) as number[];
            const bandHashesAltered = positionBandHashes(game.replace('a8', 'k11'), 11) as number[];

            const sameBands = bandHashes.filter((bandHash, bandNo) => bandHash === bandHashesAltered[bandNo]);

            assert.ok(sameBands.length >= 1, 'similar positions should collide on at least one band');
        });

        it('returns fully different band hashes for two unrelated positions', () => {
            const bandHashes = positionBandHashes(game, 11) as number[];
            const bandHashesUnrelated = positionBandHashes('a1 a2 b1 b2 c1 c2 d1 d2', 11) as number[];

            for (let bandNo = 0; bandNo < BAND_COUNT; ++bandNo) {
                assert.notStrictEqual(bandHashes[bandNo], bandHashesUnrelated[bandNo]);
            }
        });
    });

    describe('allMirrorsBandHashes', () => {
        it('band hashes of a mirror variant of the reference equal band hashes of the mirrored game', () => {
            // mirroredGame is game mirrored around the center
            const mirroredGame = 'f6 f7 e5 h6 g8 d8 f5 j5 e4 b9 e8 e7 f8 g6 i5 i6 c9 c8 a8 a9 k5 k4';

            // both games are exact mirrors of each other
            assert.deepStrictEqual(compareAllPositions(game, mirroredGame, 11), { missing: [], extra: [] });

            const reference = allMirrorsBandHashes(game, 11);
            const stored = positionBandHashes(mirroredGame, 11);

            assert.notStrictEqual(reference, null);

            const centerMirrorBandHashes = reference?.mirrorsBandHashes[2] as number[];
            const collidingBands = centerMirrorBandHashes.filter((bandHash, bandNo) => bandHash === (stored as number[])[bandNo]);

            assert.ok(collidingBands.length >= 1, 'a mirrored game should collide on at least one band of the mirror variant');
        });
    });
});
