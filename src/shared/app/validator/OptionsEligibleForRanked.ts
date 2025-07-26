import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { HostedGameOptions } from '../models/index.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../ratingUtils.js';

/**
 * When enabling "ranked" game option, these validators check others options are eligible for a ranked game.
 * I.e setting boardsize=5 and ranked=true won't pass validation.
 */
abstract class OptionsEligibleForRanked implements ValidatorConstraintInterface
{
    abstract validateOptions(options: HostedGameOptions): boolean;

    validate(ranked: boolean, args: ValidationArguments): Promise<boolean> | boolean
    {
        if (!ranked) {
            return true;
        }

        const { object } = args;

        if (!(object instanceof HostedGameOptions)) {
            throw new Error('@OptionsEligibleForRanked expected to be used on an instance of HostedGameOptions');
        }

        return this.validateOptions(object);
    }
}

@ValidatorConstraint({ name: 'boardsizeEligibleForRanked', async: false })
export class BoardsizeEligibleForRanked extends OptionsEligibleForRanked
{
    validateOptions(options: HostedGameOptions): boolean
    {
        return options.boardsize >= RANKED_BOARDSIZE_MIN && options.boardsize <= RANKED_BOARDSIZE_MAX;
    }

    defaultMessage(): string
    {
        return `Allowed board sizes for ranked games are ${RANKED_BOARDSIZE_MIN} to ${RANKED_BOARDSIZE_MAX}`;
    }
}

@ValidatorConstraint({ name: 'firstPlayerEligibleForRanked', async: false })
export class FirstPlayerEligibleForRanked extends OptionsEligibleForRanked
{
    validateOptions(options: HostedGameOptions): boolean
    {
        return options.firstPlayer === null;
    }

    defaultMessage(): string
    {
        return 'First player must be random for ranked games';
    }
}

@ValidatorConstraint({ name: 'swapRuleEligibleForRanked', async: false })
export class SwapRuleEligibleForRanked extends OptionsEligibleForRanked
{
    validateOptions(options: HostedGameOptions): boolean
    {
        return options.swapRule === true;
    }

    defaultMessage(): string
    {
        return 'Swap rule must be enabled for ranked games';
    }
}

@ValidatorConstraint({ name: 'opponentTypeEligibleForRanked', async: false })
export class OpponentTypeEligibleForRanked extends OptionsEligibleForRanked
{
    validateOptions(options: HostedGameOptions): boolean
    {
        if (process.env.ALLOW_RANKED_BOT_GAMES === 'true') {
            return true;
        }

        return options.opponentType === 'player';
    }

    defaultMessage(): string
    {
        return 'Bot games cannot be ranked';
    }
}
