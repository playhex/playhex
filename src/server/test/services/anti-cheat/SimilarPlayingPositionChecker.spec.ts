import assert from 'assert';
import { describe, it } from 'mocha';
import { SimilarPlayingPositionChecker } from '../../../services/anti-cheat/SimilarPlayingPositionChecker.js';
import { SimilarPositionDetectedError } from '../../../services/anti-cheat/SimilarPositionDetectedError.js';
import { type CandidatePositionsProviderInterface } from '../../../services/anti-cheat/CandidatePositionsProviderInterface.js';
import { type Position } from '../../../../shared/position-comparator/position-comparator.js';

class TestProvider implements CandidatePositionsProviderInterface
{
    getCandidatePositions(): Position[]
    {
        return [
            { boardsize: 11, moves: ['c3', 'g7'], source: 'other' },
            { boardsize: 11, moves: ['a2', 'swap-pieces', 'd4', 'e6'], source: 'same' },
        ];
    }
}

describe.only('SimilarPlayingPositionChecker', () => {
    it('flags same position', () => {
        const checker = new SimilarPlayingPositionChecker(new TestProvider());

        assert.throws(() => {
            checker.checkPosition({
                boardsize: 11,
                moves: ['a2', 'swap-pieces', 'd4', 'e6'],
            });
        }, (error: unknown) => {
            assert(error instanceof SimilarPositionDetectedError);

            const result = error.getComparisonResult();

            assert.strictEqual(result.distance, 0);
            assert.strictEqual(result.position.source, 'same');
            assert.strictEqual(result.mirror, false);

            return true;
        });
    });
});
