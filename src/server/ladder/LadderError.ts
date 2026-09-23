import { TranslatableHttpError } from '../../shared/app/TranslatableHttpError.js';
import type { LadderRefusalReason } from '../../shared/app/ladder/ladderRules.js';

/**
 * Player action refused by a ladder rule.
 */
export class LadderRefusalError extends TranslatableHttpError
{
    constructor(
        readonly reason: LadderRefusalReason,
    ) {
        super(403, `ladder.refusal.${reason}`);
    }
}

/**
 * Invalid ladder action (wrong state, not allowed...).
 */
export class LadderError extends TranslatableHttpError
{
    constructor(
        translationKey: string,
        httpStatus = 400,
    ) {
        super(httpStatus, translationKey);
    }
}
