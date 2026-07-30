import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { validateMove } from '../../move-notation/move-notation.js';

/**
 * Validates that a value is a valid hex board coordinate (e.g "a1", "d4").
 * Excludes special moves like "swap-pieces"/"pass", which are not board stones.
 * Use with `@Validate(IsHexCoordinate, { each: true })` on an array of coordinates.
 */
@ValidatorConstraint({ name: 'isHexCoordinate', async: false })
export class IsHexCoordinate implements ValidatorConstraintInterface
{
    validate(value: unknown): boolean
    {
        return typeof value === 'string' && validateMove(value);
    }

    defaultMessage(): string
    {
        return 'Each value must be a valid hex board coordinate';
    }
}
