import i18next, { t } from 'i18next';
import { DomainHttpError } from '../../shared/app/DomainHttpError.js';

/**
 * Message to display to player for an error thrown by an api call.
 * Domain errors are translated when a translation exists for their type,
 * e.g "content_restricted" when player is blocked by moderation.
 */
export const apiErrorMessage = (e: unknown): string => {
    if (e instanceof DomainHttpError) {
        return i18next.exists(e.type) ? t(e.type) : (e.reason ?? e.type);
    }

    return e instanceof Error ? e.message : String(e);
};

/**
 * Player cannot post content (tournament, puzzle, video, avatar...)
 * because of a moderation action.
 */
export const isContentRestrictedError = (e: unknown): e is DomainHttpError =>
    e instanceof DomainHttpError && e.type === 'content_restricted';
