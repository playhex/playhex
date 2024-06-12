import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { HostedGameOptions } from '../models';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../ratingUtils';

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
        return null === options.firstPlayer;
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
        return true === options.swapRule;
    }

    defaultMessage(): string
    {
        return 'Swap rule must be enabled for ranked games';
    }
}
