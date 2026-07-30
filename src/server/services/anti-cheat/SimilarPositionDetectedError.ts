import { TranslatableHttpError } from '../../../shared/app/TranslatableHttpError.js';
import { type CanonicalPosition, type ComparisonResult } from '../../../shared/position-comparator/position-comparator.js';

export class SimilarPositionDetectedError extends Error
{
    constructor(
        private comparisonResult: ComparisonResult,

        /**
         * The position that has been refused.
         */
        private position: CanonicalPosition,
    ) {
        super('This position is too similar to a candidate position. Refusing to process/analyze it.');
    }

    getComparisonResult(): ComparisonResult
    {
        return this.comparisonResult;
    }

    getPosition(): CanonicalPosition
    {
        return this.position;
    }
}

export const similarPositionDetectedToTranslatableHttpError = (similarPositionDetectedError: SimilarPositionDetectedError): TranslatableHttpError => {
    const { position, mirror } = similarPositionDetectedError.getComparisonResult();

    const translationKey = mirror
        ? `anti_cheat.flagged_position_mirrored_${mirror.replaceAll('-', '_')}`
        : 'anti_cheat.flagged_position';

    return new TranslatableHttpError(403, translationKey, {
        source: position.source,
    });
};
