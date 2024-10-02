import { NextFunction, Request, Response, Express } from 'express';
import { HexServer } from '../../server';
import { sessionMiddleware } from '../sessionMiddleware';
import Container from 'typedi';
import PlayerRepository from '../../repositories/PlayerRepository';

const addSessionMiddlewares = (app: Express, io: HexServer): void => {
    // Makes express and socketio aware of session in cookie
    app.use(sessionMiddleware);
    io.use((socket, next) => sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction));

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
