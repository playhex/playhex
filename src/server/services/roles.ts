import { HttpError } from 'routing-controllers';

/**
 * Can do operations from AdminController (maintenance, debug, cancel game manually, shadow ban...)
 */
export const ROLE_ADMIN = 'ADMIN';

/**
 * Can do moderation from ModerationController (moderate chat messages...)
 */
export const ROLE_MODERATOR = 'MODERATOR';

/**
 * Check authorization given provided token and required roles.
 */
export const checkAuthorization = (authorizationHeader: undefined | string, roles: string[]): boolean => {
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
