import { NextFunction, Request, Response } from 'express';
import Container from 'typedi';
import PlayerRepository from '../../repositories/PlayerRepository';
import HttpError from './HttpError';

const playerRepository = Container.get(PlayerRepository);
const forbiddenError = new HttpError(403, 'This endpoints requires authentication');

export const authenticated = async (req: Request, res: Response, next: NextFunction) => {
    const { playerId } = req.session;

    if (!playerId) {
        throw forbiddenError;
    }

    const playerData = await playerRepository.getPlayer(playerId);

    if (null === playerData) {
        throw forbiddenError;
    }

    res.locals.playerData = playerData;

    next();
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.get('Authorization');

    if (undefined === authorization || !authorization.startsWith('Bearer ')) {
        throw new HttpError(403, 'Restricted admin area. Add header Authorization: Bearer xxx');
    }

    const { ADMIN_PASSWORD } = process.env;
    const token = authorization.substring('Bearer '.length);

    if ('string' !== typeof ADMIN_PASSWORD || token !== ADMIN_PASSWORD) {
        throw new HttpError(403, 'Invalid admin token');
    }

    next();
};
