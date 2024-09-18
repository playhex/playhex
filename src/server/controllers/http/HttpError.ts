import HandledError, { ErrorResponse, HandledErrorType, handledErrors } from '../../../shared/app/Errors';
import { InvalidPseudoError, PseudoTooLongError, PseudoTooShortError } from '../../../shared/app/pseudoUtils';
import { ClassConstructor } from 'class-transformer';
import { MustBeGuestError, PseudoAlreadyTakenError } from '../../repositories/PlayerRepository';
import { InvalidPasswordError, PseudoNotExistingError } from '../../services/security/authentication';

/**
 * Represent a client error sent from API.
 */
export default class HttpError extends Error
{
    constructor(
        /**
         * Status code that should be sent to client.
         * Should be only 4xx errors.
         */
        public status: number,

        /**
         * Can be displayed to player, although not translated.
         */
        public reason: string,

        /**
         * Used for HandledErrors, to make the error identifiable front side.
         */
        public type?: HandledErrorType,

        /**
         * Contains any full object or array containing details. I.e fields validation
         */
        public details?: unknown,
    ) {
        super(`HttpError ${status}: "${reason}"` + (type ? ` (type="${type}")` : ''));
    }

    normalize(): ErrorResponse
    {
        return {
            success: false,
            reason: this.reason,
            type: this.type,
            details: this.details,
        };
    }

    static fromHandledError(handledError: HandledError): HttpError
    {
        const matches: { type: ClassConstructor<HandledError>, key: HandledErrorType }[] = [
            { type: MustBeGuestError, key: 'must_be_logged_in_as_guest' },
            { type: PseudoAlreadyTakenError, key: 'pseudo_already_taken' },
            { type: PseudoNotExistingError, key: 'pseudo_not_existing' },
            { type: InvalidPasswordError, key: 'invalid_password' },
            { type: PseudoTooShortError, key: 'pseudo_too_short' },
            { type: PseudoTooLongError, key: 'pseudo_too_long' },
            { type: InvalidPseudoError, key: 'invalid_pseudo' },
        ];

        for (let i = 0; i < matches.length; ++i) {
            const { type, key } = matches[i];

            if (handledError instanceof type) {
                const e = handledErrors[key];

                return new HttpError(
                    e[0] as number,
                    e[1] as string,
                    key,
                );
            }
        }

        return new HttpError(
            500,
            handledError.message,
        );
    }
}
