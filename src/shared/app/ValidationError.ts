import { ValidationError } from 'class-validator';

type ValidationErrorPayload = {
    errors: ValidationError[];
};

export type FailedProperties = {
    [property: string]: string[];
};

/**
 * Can be thrown through the app, contains a list of ValidationError
 * returned by class-validator.
 */
export class AppValidationError extends Error
{
    constructor(
        public errors: ValidationError[],
    ) {
        super('Validation errors');
    }

    override toString(): string
    {
        const errorStrings: string[] = [];

        for (const error of this.errors) {
            for (const s of Object.values(error.constraints ?? [])) {
                errorStrings.push(s);
            }
        }

        return errorStrings.join(', ');
    }

    byProperty(): FailedProperties
    {
        return toFailedProperties(this.errors);
    }
}

/**
 * In case of a validation error in embedded object, returns e.g { timeControl.timeIncrement: 'must be an integer' }
 */
const toFailedPropertiesRecursive = (
    /**
     * Final object to add errors on
     */
    failedProperties: FailedProperties,

    /**
     * List of constraint to parse. Can be contraints on children constraint.
     */
    validationErrors: ValidationError[],

    /**
     * Current path of parent properties in case of children constraints, e.g ['timeControl']
     */
    propertyPath: string[],
) => {
    for (const validationError of validationErrors) {
        const { property, children, constraints } = validationError;

        if (undefined !== children) {
            toFailedPropertiesRecursive(failedProperties, children, [...propertyPath, property]);
        }

        if (undefined === constraints) {
            continue;
        }

        failedProperties[[...propertyPath, property].filter(v => undefined !== v).join('.')] = Object.values(constraints);
    }
};

/**
 * @returns All failed constraints keyed by property name, e.g:
 *          ```
 *          {
 *             boardsize: ['must be an integer', 'must be >= 11'],
 *             ranked: ['must be a boolean'],
 *          }
 *          ```
 */
export const toFailedProperties = (validationErrors: ValidationError[]): FailedProperties => {
    const failedProperties: FailedProperties = {};

    toFailedPropertiesRecursive(failedProperties, validationErrors, []);

    return failedProperties;
};

export const isValidationError = (payload: unknown): payload is ValidationErrorPayload => {
    return 'object' === typeof payload
        && null !== payload
        && 400 === (payload as { httpCode?: number }).httpCode
        && 'BadRequestError' === (payload as { name?: string }).name
        && 'object' === typeof (payload as { errors?: object } ).errors
    ;
};
