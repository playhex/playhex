import { type Position } from '../../../shared/position-comparator/position-comparator.js';

export interface CandidatePositionsProviderInterface
{
    getCandidatePositions(): Position[];
}
