import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import TimeControlType from '../../time-control/TimeControlType.js';

/**
 * Ensure time control is valid, either live or correspondence.
 * Prevent weird time controls like 1 day + 1 second increment,
 * or 12h + 0s, or 4h + 4h
 *
 * To use on TimeControlType parameter.
 */
@ValidatorConstraint({ name: 'timeControlLiveOrCorrespondence', async: false })
export class TimeControlIsLiveOrCorrespondence implements ValidatorConstraintInterface
{
    validate(timeControlType: TimeControlType): Promise<boolean> | boolean
    {
        if (timeControlType.family === 'fischer') {
            return this.checkInitialAndIncrement(timeControlType.options.initialTime, timeControlType.options.timeIncrement ?? 0);
        }

        if (timeControlType.family === 'byoyomi') {
            return this.checkInitialAndIncrement(timeControlType.options.initialTime, timeControlType.options.periodTime);
        }

        return true;
    }

    private checkInitialAndIncrement(initialTime: number, increment: number): boolean
    {
        if (initialTime <= 4 * 3600 * 1000) {
            return increment <= 3 * 60 * 1000;
        }

        if (initialTime >= 86400 * 1000) {
            return increment >= 86400 * 1000;
        }

        // not allowing initial time between 4h and 24h
        return false;
    }

    defaultMessage(): string
    {
        return 'TimeControl must be either live (initial <= 4h and increment <= 3min) or correspondence (initial >= 1d and increment >= 1d)';
    }
}
