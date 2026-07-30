import { type CandidatePosition } from '../../../shared/position-comparator/position-comparator.js';

export interface CandidatePositionsProviderInterface
{
    /**
     * Returns list of positions that should not be analyzed or played by a strong AI.
     * Usually currently playing 1v1 games.
     */
    getCandidatePositions(): CandidatePosition[];
}
