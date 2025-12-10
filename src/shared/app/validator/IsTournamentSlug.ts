import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { slugifyTournamentName } from '../tournamentUtils.js';

/**
 * Player can enter his own tournament slug.
 * This validator checks whether slug is valid (not entering spaces or caps...).
 */
@ValidatorConstraint()
export class IsTournamentSlug implements ValidatorConstraintInterface
{
    validate(value: unknown): boolean
    {
        if (typeof value !== 'string') {
            return false;
        }

        return slugifyTournamentName(value) === value;
    }

    defaultMessage(): string
    {
        return 'Invalid tournament slug. Expected format like "hex-monthly-42".';
    }
}
