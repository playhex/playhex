import { HttpError } from 'routing-controllers';
import { rateLimiterConsumeFailedApiKey } from './rate-limiters.js';

/**
 * Can do operations from AdminController (maintenance, debug, cancel game manually, shadow ban...)
 */
export const ROLE_ADMIN = 'ADMIN';

/**
 * Can do moderation from AdminModerationController (moderate chat messages...)
 */
export const ROLE_MODERATOR = 'MODERATOR';

/**
 * Check authorization given provided token and required roles.
 * Rate limited by ip on invalid token to prevent brute-forcing admin/moderator passwords.
 */
export const checkAuthorization = async (authorizationHeader: undefined | string, roles: string[], ip: string | undefined): Promise<boolean> => {
    if (roles.length === 0) {
        return false; // Not using @Authorized() with no roles provided for now
    }

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        throw new HttpError(403, 'Restricted admin area. Add header Authorization: Bearer xxx');
    }

    const token = authorizationHeader.substring('Bearer '.length);
    const { ADMIN_PASSWORD, MODERATOR_PASSWORD } = process.env;

    let userRole: null | string = null;

    if (ADMIN_PASSWORD && token === ADMIN_PASSWORD) {
        userRole = ROLE_ADMIN;
    } else if (MODERATOR_PASSWORD && token === MODERATOR_PASSWORD) {
        userRole = ROLE_MODERATOR;
    }

    if (!userRole) {
        await rateLimiterConsumeFailedApiKey(ip);
        throw new HttpError(403, 'Invalid admin token');
    }

    if (roles.includes(ROLE_ADMIN)) {
        return userRole === ROLE_ADMIN;
    }

    if (roles.includes(ROLE_MODERATOR)) {
        return userRole === ROLE_MODERATOR || userRole === ROLE_ADMIN;
    }

    throw new HttpError(403, 'Token valid, but insufficient privileges');
};
