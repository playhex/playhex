export type ErrorResponse = {
    success: false;
    type?: HandledErrorType;
    reason: string;
    details?: unknown;
};

/**
 * Error thrown from server or shared
 * that can be catched by the API
 * and sent back to player as an identifiable error.
 */
export default class HandledError extends Error {}

export type HandledErrorType = keyof typeof handledErrors;

/**
 * Enumeration of handled http errors.
 */
export const handledErrors = {
    must_be_logged_in_as_guest: [403, 'You must be logged in as guest'],
    pseudo_already_taken: [409, 'This pseudo is already used by another player'],
    pseudo_not_existing: [403, 'No player with this pseudo'],
    invalid_password: [403, 'Invalid password for this player'],
    pseudo_too_short: [400, 'Pseudo is too short'],
    pseudo_too_long: [400, 'Pseudo is too long'],
    invalid_pseudo: [400, 'Pseudo is invalid'],
};
