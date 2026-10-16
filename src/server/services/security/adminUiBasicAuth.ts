import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

type AdminUiCredentials = {
    username: string;
    password: string;
};

/**
 * Shared basic auth credentials for /admin and every admin UI (/admin/bull-board, /admin/sockeye, socket.io admin),
 * from ADMIN_UI_USER and ADMIN_UI_PASS.
 *
 * @throws {Error} If only one of them is set
 */
export const getAdminUiCredentials = (): null | AdminUiCredentials => {
    const {
        ADMIN_UI_USER: username,
        ADMIN_UI_PASS: password,
    } = process.env;

    if (!username !== !password) {
        throw new Error('ADMIN_UI_USER and ADMIN_UI_PASS must be either both set, or both unset.');
    }

    if (!username || !password) {
        return null;
    }

    return { username, password };
};

/**
 * Same as getAdminUiCredentials(), but throws when not set.
 * To call when an admin UI is enabled.
 */
export const requireAdminUiCredentials = (adminUiName: string): AdminUiCredentials => {
    const credentials = getAdminUiCredentials();

    if (credentials === null) {
        throw new Error(`ADMIN_UI_USER and ADMIN_UI_PASS must both be set to serve ${adminUiName}.`);
    }

    return credentials;
};

const constantTimeEquals = (a: string, b: string): boolean => {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

/**
 * Basic auth with shared admin UI credentials.
 * Same realm everywhere, so browser asks credentials only once for all admin UIs.
 */
export const adminUiBasicAuth = (req: Request, res: Response, next: NextFunction): void => {
    const credentials = getAdminUiCredentials();
    const header = req.headers.authorization ?? '';
    const [scheme, encoded] = header.split(' ');

    if (credentials !== null && scheme === 'Basic' && encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString();
        const separator = decoded.indexOf(':');

        if (
            separator > -1
            && constantTimeEquals(decoded.slice(0, separator), credentials.username)
            && constantTimeEquals(decoded.slice(separator + 1), credentials.password)
        ) {
            next();
            return;
        }
    }

    res.set('WWW-Authenticate', 'Basic realm="PlayHex admin", charset="UTF-8"');
    res.status(401).send('Authentication required.');
};
