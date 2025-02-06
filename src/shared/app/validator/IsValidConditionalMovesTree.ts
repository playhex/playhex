import { validateTreeFormat } from '../conditionalMovesUtils';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint()
export class IsValidConditionalMovesTree implements ValidatorConstraintInterface
{
    validate(value: unknown): boolean
    {
        return validateTreeFormat(value);
    }

    defaultMessage(): string
    {
        return "Invalid conditional moves tree, expected format like: X = [['a1', 'a2', X]]";
    }
}
