import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { HANDICAP_STEP, isValidPresetHandicap, MAX_HANDICAP } from '../handicap.js';

@ValidatorConstraint({ name: 'presetHandicapIsValid', async: false })
export class PresetHandicapIsValid implements ValidatorConstraintInterface
{
    validate(presetHandicap: number): boolean
    {
        return isValidPresetHandicap(presetHandicap);
    }

    defaultMessage(): string
    {
        return `Handicap must be between -${MAX_HANDICAP} and ${MAX_HANDICAP}, by steps of ${HANDICAP_STEP}`;
    }
}
