import { NextFunction, Request, Response, Express } from 'express';
import { HexServer } from '../../server.js';
import { sessionMiddleware } from '../sessionMiddleware.js';
import { Container } from 'typedi';
import PlayerRepository from '../../repositories/PlayerRepository.js';
import BannedIpService from '../BannedIpService.js';
import { getClientIp } from './getClientIp.js';

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
        const { playerId } = socket.request.session;

        // socket not authenticated
        if (!playerId) {
            socket.data.player = null;
            next();
            return;
        }

        socket.data.player = await playerRepository.getPlayer(playerId);

        next();
    });
};

export {
    addSessionMiddlewares,
};
