import { type Position } from '../../../shared/position-comparator/position-comparator.js';

export interface CandidatePositionsProviderInterface
{
    /**
     * Returns list of games that should be checked for similarity
     * before analyzing a game.
     * Usually it should return playing games.
     */
    getCandidatePositions(): Position[];
}
