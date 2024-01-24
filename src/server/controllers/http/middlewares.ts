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
