import { Inject, Service } from 'typedi';
import { type CandidatePositionsProviderInterface } from './CandidatePositionsProviderInterface.js';
import { CanonicalPosition, comparePositions, Position } from '../../../shared/position-comparator/position-comparator.js';
import { SimilarPositionDetectedError } from './SimilarPositionDetectedError.js';
import { CandidatePositionsProvider } from './CandidatePositionsProvider.js';

/**
 * Only flag games having less distance.
 * Higher: may flag more games, even if not really similar
 * Lower: may miss similar games
 */
const MAX_DISTANCE = 6;

/**
 * Check a position is not similar to a currently playing position.
 * This is used to prevent cheating, by using strong AI to reveal which move it would play
 * in a same or similar position, and reuse the played move to a currently playing game.
 *
 * - Block AI analyze of a playing position,
 * - prevent strong AI respond on a playing position.
 */
@Service()
export class SimilarPlayingPositionChecker
{
    constructor(
        @Inject(() => CandidatePositionsProvider)
        private candidatePositionsProvider: CandidatePositionsProviderInterface,
    ) {}

    /**
     * @param position Check whether this position is too similar to a candidate position (a currently playing game).
     *
     * @throws {SimilarPositionDetectedError}
     */
    checkPosition(position: Position | CanonicalPosition): void
    {
        const results = comparePositions(
            position,
            this.candidatePositionsProvider.getCandidatePositions(),
            MAX_DISTANCE,
        );

        if (results.length > 0) {
            throw new SimilarPositionDetectedError(results[0]);
        }
    }
}
