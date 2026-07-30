import { Inject, Service } from 'typedi';
import { type CandidatePositionsProviderInterface } from './CandidatePositionsProviderInterface.js';
import { comparePositions, createCanonicalPosition, isCanonicalPosition, normalizeCanonicalPosition, type CanonicalPosition, type Position } from '../../../shared/position-comparator/position-comparator.js';
import { SimilarPositionDetectedError } from './SimilarPositionDetectedError.js';
import { CandidatePositionsProvider } from './CandidatePositionsProvider.js';
import SimilarPositionFlagRepository, { type SimilarPositionFlagInput } from '../../repositories/SimilarPositionFlagRepository.js';
import logger from '../logger.js';
import { errorToLogger } from '../../../shared/app/utils.js';

/**
 * Bots with a relative level below this are too weak to help cheating,
 * positions they play are not checked.
 * Bots without relative level are checked.
 */
export const MIN_BOT_LEVEL_CHECKED = 4;

/**
 * Check a position is not similar to a currently playing position.
 * This is used to prevent cheating, by using strong AI to reveal which move it would play
 * in a same or similar position, and reuse the played move to a currently playing game.
 *
 * - Block AI analyze of a playing position,
 * - prevent strong AI respond on a playing position.
 *
 * Similarity rules are in shared/position-comparator/position-similarity.ts
 */
@Service()
export class SimilarPlayingPositionChecker
{
    constructor(
        @Inject(() => CandidatePositionsProvider)
        private candidatePositionsProvider: CandidatePositionsProviderInterface,

        @Inject(() => SimilarPositionFlagRepository)
        private similarPositionFlagRepository: Pick<SimilarPositionFlagRepository, 'create'>,
    ) {}

    /**
     * @param position Check whether this position is too similar to a candidate position (a currently playing game).
     *
     * @returns Checked position, validated and normalized. Send this one to the AI, not the raw input.
     *
     * @throws {InvalidPositionError} Position is invalid (duplicate stones, out of board...), and cannot be checked.
     * @throws {SimilarPositionDetectedError}
     */
    checkPosition(position: Position | CanonicalPosition): CanonicalPosition
    {
        const canonicalPosition = isCanonicalPosition(position)
            ? normalizeCanonicalPosition(position)
            : createCanonicalPosition(position)
        ;

        const results = comparePositions(
            canonicalPosition,
            this.candidatePositionsProvider.getCandidatePositions(),
        );

        if (results.length > 0) {
            throw new SimilarPositionDetectedError(results[0], canonicalPosition);
        }

        return canonicalPosition;
    }

    /**
     * Keep a trace of the detected position, for moderation.
     * Never throws, only logs errors.
     */
    async flag(error: SimilarPositionDetectedError, context: Omit<SimilarPositionFlagInput, 'comparisonResult' | 'position' | 'flaggedGamePublicId'>): Promise<void>
    {
        const comparisonResult = error.getComparisonResult();
        const { gamePublicId } = comparisonResult.position;

        logger.warning('Anti-cheat: position similar to a playing game', {
            ...context,
            flaggedGame: comparisonResult.position.source,
            similarity: comparisonResult.similarity,
            common: comparisonResult.common,
            mirror: comparisonResult.mirror,
        });

        if (!gamePublicId) {
            return;
        }

        try {
            await this.similarPositionFlagRepository.create({
                ...context,
                comparisonResult,
                position: error.getPosition(),
                flaggedGamePublicId: gamePublicId,
            });
        } catch (e) {
            logger.error('Anti-cheat: could not persist similar position flag', errorToLogger(e));
        }
    }
}
