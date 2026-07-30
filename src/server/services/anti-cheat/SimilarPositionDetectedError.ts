import { TranslatableHttpError } from '../../../shared/app/TranslatableHttpError.js';
import { type ComparisonResult } from '../../../shared/position-comparator/position-comparator.js';

export class SimilarPositionDetectedError extends Error
{
    constructor(
        private comparisonResult: ComparisonResult,
    ) {
        super('This position is too similar to a candidate position. Refusing to process/analyze it.');
    }

    getComparisonResult(): ComparisonResult
    {
        return this.comparisonResult;
    }
}

export const similarPositionDetectedToTranslatableHttpError = (similarPositionDetectedError: SimilarPositionDetectedError): TranslatableHttpError => {
    const { position, mirror } = similarPositionDetectedError.getComparisonResult();

    return new TranslatableHttpError(403, 'flagged_position_error', {
        source: position.source,
        mirror: mirror || 'none',
    });
};
