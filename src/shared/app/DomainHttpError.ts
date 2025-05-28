/**
 * All possible domain error keys.
 */
type DomainHttpErrorTypes =
    'must_be_logged_in_as_guest'
    | 'pseudo_already_taken'
    | 'pseudo_not_existing'
    | 'invalid_password'
    | 'pseudo_too_short'
    | 'pseudo_too_long'
    | 'invalid_pseudo'
    | 'player_not_found'
    | 'tournament_title_duplicate'
    | 'tournament_player_is_banned'
    | 'tournament_account_required'
    | 'tournament_not_enough_participants_to_start'
;

type DomainHttpErrorType = {
    /**
     * Which http code api should return.
     * Must be 4xx.
     */
    httpCode: number;

    /**
     * Type of error, used to be identified front side.
     */
    type: DomainHttpErrorTypes;

    /**
     * System message
     */
    reason?: string;

    /**
     * Optional details, e.g fields validations errors, any parameters, ...
     */
    details?: unknown;
};

export type DomainHttpErrorPayload = DomainHttpErrorType & {
    /**
     * To keep same format as previous payload
     */
    success: false;
};

/**
 * Error thrown from controllers that can be identified front side.
 *
 * Example:
 *
 *  - from server controller:
 * ```
 * throw new DomainHttpError(403, 'invalid_password');
 * ```
 *
 *  - from client:
 * ```
 * try {
 *   fetch(...);
 * } catch (e) {
 *   if (e instanceof DomainHttpError) {
 *     i18next.t(e.type);
 *   }
 * }
 */
export class DomainHttpError extends Error implements DomainHttpErrorType
{
    constructor(
        public httpCode: number,
        public type: DomainHttpErrorTypes,
        public reason?: string,
        public details?: unknown,
    ) {
        super(reason ?? type);
    }
}

export const isDomainHttpErrorPayload = (payload: unknown): payload is DomainHttpErrorPayload => {
    return 'object' === typeof payload
        && null !== payload
        && false === (payload as { success?: unknown }).success
        && 'string' === typeof (payload as DomainHttpErrorPayload).type
    ;
};

export const normalizeDomainHttpError = (domainHttpError: DomainHttpError): DomainHttpErrorPayload => ({
    success: false,
    httpCode: domainHttpError.httpCode,
    type: domainHttpError.type,
    reason: domainHttpError.reason,
    details: domainHttpError.details,
});

export const denormalizeDomainHttpError = (domainHttpErrorPayload: DomainHttpErrorPayload): DomainHttpError => new DomainHttpError(
    domainHttpErrorPayload.httpCode,
    domainHttpErrorPayload.type,
    domainHttpErrorPayload.reason,
    domainHttpErrorPayload.details,
);
