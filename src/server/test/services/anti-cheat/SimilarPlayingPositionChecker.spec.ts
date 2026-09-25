import assert from 'assert';
import { describe, it } from 'mocha';
import { SimilarPlayingPositionChecker } from '../../../services/anti-cheat/SimilarPlayingPositionChecker.js';
import { SimilarPositionDetectedError } from '../../../services/anti-cheat/SimilarPositionDetectedError.js';
import { type CandidatePositionsProviderInterface } from '../../../services/anti-cheat/CandidatePositionsProviderInterface.js';
import { createCanonicalPosition, InvalidPositionError, type CandidatePosition } from '../../../../shared/position-comparator/position-comparator.js';
import type { HexMove } from '../../../../packages/move-notation/hex-move-notation.js';
import type { Move } from '../../../../packages/move-notation/move-notation.js';
import type { SimilarPositionFlagInput } from '../../../repositories/SimilarPositionFlagRepository.js';
import type { SimilarPositionFlag } from '../../../../shared/app/models/index.js';

const playingMoves: HexMove[] = ['a2', 'swap-pieces', 'f6', 'f5', 'g7', 'd6', 'e4', 'h4', 'f7', 'b7', 'g8', 'j3'];

class TestProvider implements CandidatePositionsProviderInterface
{
    getCandidatePositions(): CandidatePosition[]
    {
        return [
            { boardsize: 11, moves: ['c3', 'g7', 'a1', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'], gamePublicId: 'other', source: 'other' },
            { boardsize: 11, moves: playingMoves, gamePublicId: 'playing', source: 'playing' },
        ];
    }
}

class TestRepository
{
    flags: SimilarPositionFlagInput[] = [];

    create(input: SimilarPositionFlagInput): Promise<SimilarPositionFlag>
    {
        this.flags.push(input);

        return Promise.resolve({} as SimilarPositionFlag);
    }
}

describe('SimilarPlayingPositionChecker', () => {
    it('flags same position', () => {
        const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

        assert.throws(() => {
            checker.checkPosition({
                boardsize: 11,
                moves: playingMoves,
            });
        }, (error: unknown) => {
            assert(error instanceof SimilarPositionDetectedError);

            const result = error.getComparisonResult();

            assert.strictEqual(result.similarity, 1);
            assert.strictEqual(result.position.source, 'playing');
            assert.strictEqual(result.mirror, false);

            return true;
        });
    });

    it('accepts a different position', () => {
        const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

        assert.doesNotThrow(() => checker.checkPosition({
            boardsize: 11,
            moves: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'j1', 'j2'],
        }));
    });

    it('accepts a short common opening, even if same as a playing game', () => {
        const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

        assert.doesNotThrow(() => checker.checkPosition({
            boardsize: 11,
            moves: playingMoves.slice(0, 5),
        }));
    });

    it('persists a flag with flagged game and context', async () => {
        const repository = new TestRepository();
        const checker = new SimilarPlayingPositionChecker(new TestProvider(), repository);

        try {
            checker.checkPosition({ boardsize: 11, moves: playingMoves });
            assert.fail('Expected SimilarPositionDetectedError');
        } catch (e) {
            assert(e instanceof SimilarPositionDetectedError);
            await checker.flag(e, { context: 'hexplorer', ip: '127.0.0.1' });
        }

        assert.strictEqual(repository.flags.length, 1);
        assert.strictEqual(repository.flags[0].flaggedGamePublicId, 'playing');
        assert.strictEqual(repository.flags[0].context, 'hexplorer');
        assert.strictEqual(repository.flags[0].ip, '127.0.0.1');
    });

    describe('Hexplorer like input (canonical position)', () => {
        const playing = createCanonicalPosition({ boardsize: 11, moves: playingMoves });

        it('flags same position', () => {
            const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

            assert.throws(() => checker.checkPosition(playing), SimilarPositionDetectedError);
        });

        it('cannot be bypassed by sending each stone twice', () => {
            const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

            assert.throws(() => checker.checkPosition({
                boardsize: 11,
                black: [...playing.black, ...playing.black],
                white: [...playing.white, ...playing.white],
            }), InvalidPositionError);
        });

        it('cannot be bypassed by putting a stone in both colors', () => {
            const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

            assert.throws(() => checker.checkPosition({
                boardsize: 11,
                black: [...playing.black, ...playing.white],
                white: playing.white,
            }), InvalidPositionError);
        });

        it('cannot be bypassed by adding stones out of board', () => {
            const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

            assert.throws(() => checker.checkPosition({
                boardsize: 11,
                black: [...playing.black, 'z20', 'z21', 'z22', 'z23', 'z24'],
                white: [...playing.white, 'y20', 'y21', 'y22', 'y23', 'y24'],
            }), InvalidPositionError);
        });

        it('cannot be bypassed with alternative notation, like "a01"', () => {
            const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());
            const withLeadingZero = (move: Move): Move => move.replace(/(\d+)$/, n => n.padStart(2, '0')) as Move;

            assert.throws(() => checker.checkPosition({
                boardsize: 11,
                black: playing.black.map(withLeadingZero),
                white: playing.white.map(withLeadingZero),
            }), SimilarPositionDetectedError);
        });

        it('returns normalized position, to send to the AI', () => {
            const checker = new SimilarPlayingPositionChecker(new TestProvider(), new TestRepository());

            assert.deepStrictEqual(
                checker.checkPosition({ boardsize: 11, black: ['c03', 'a1'] as Move[], white: ['b2'] }),
                { boardsize: 11, black: ['a1', 'c3'], white: ['b2'] },
            );
        });
    });
});
