import { NextFunction, Request, Response, Express } from 'express';
import { HexServer } from '../../server.js';
import { sessionMiddleware } from '../sessionMiddleware.js';
import { Container } from 'typedi';
import PlayerRepository from '../../repositories/PlayerRepository.js';
import BannedIpService from '../BannedIpService.js';
import { getClientIp } from './getClientIp.js';
import logger from '../logger.js';
import { resolveOAuthAccess } from '../../oauth/oauthAccess.js';
import { canRead } from '../../oauth/oauthApiPolicy.js';

const addSessionMiddlewares = (app: Express, io: HexServer): void => {
    // Makes express and socketio aware of session in cookie
    app.use(sessionMiddleware);
    io.use((socket, next) => sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction));

    // Reject socket connections from banned IPs
    const bannedIpService = Container.get(BannedIpService);

    io.use(async (socket, next) => {
        const ip = getClientIp(socket);
        const ban = await bannedIpService.getActiveBan(ip);

        if (ban !== null) {
            next(new Error('ip_banned'));
            return;
        }

        next();
    });

    // Load player and put it in socket instance on socket connection
    const playerRepository = Container.get(PlayerRepository);

    io.use(async (socket, next) => {
        try {
            socket.data.oauthScopes = null;

            // Third-party application connecting with an OAuth access token: io(url, { auth: { token } })
            const token: unknown = socket.handshake.auth?.token;

            if (typeof token === 'string' && token !== '') {
                const oauthAccess = await resolveOAuthAccess(token);

                if (oauthAccess === null) {
                    next(new Error('invalid_token'));
                    return;
                }

                if (!canRead(oauthAccess.scopes)) {
                    next(new Error('insufficient_scope'));
                    return;
                }

                socket.data.player = oauthAccess.player;
                socket.data.oauthScopes = oauthAccess.scopes;
                next();
                return;
            }

            const { playerId } = socket.request.session;

            // socket not authenticated
            if (!playerId) {
                socket.data.player = null;
                next();
                return;
            }

            socket.data.player = await playerRepository.getPlayer(playerId);

            next();
        } catch (e) {
            logger.error('Could not authenticate socket', { errorMessage: (e as Error)?.message });
            next(new Error('server_error'));
        }
    });
};

export {
    addSessionMiddlewares,
};
