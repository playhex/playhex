import { Router } from 'express';
import { sanitizeGameOptions } from '../../../../shared/app/GameOptions';
import { createAIPlayer } from '../../../services/AIManager';
import Container from 'typedi';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { normalize } from '../../../../shared/app/serializer';
import { authenticated } from '../middlewares';
import HttpError from '../HttpError';
import { PlayerData } from '@shared/app/Types';

export default (): Router => {
    const router = Router();
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.get('/api/games', async (req, res) => {
        const { type } = req.query;

        if (!type || type === 'lobby') {
            res.send(normalize(await hostedGameRepository.getLobbyGames()));
            return;
        }

        if (type === 'ended') {
            const { take: rawTake, publicId: rawPublicId } = req.query;
            let take = 20;
            let publicId: undefined | string = undefined;

            if (undefined !== rawTake) {
                if (typeof rawTake !== 'string') {
                    throw new HttpError(400, 'Expected ?take=Number');
                }

                take = parseInt(rawTake, 10);

                if (take <= 0) {
                    throw new HttpError(400, 'Expected ?take= to be > 0');
                }
            }

            if (undefined !== rawPublicId) {
                if (typeof rawPublicId !== 'string') {
                    throw new HttpError(400, 'Expected ?publicId to be a single string');
                }

                publicId = rawPublicId;
            }

            res.send(normalize(await hostedGameRepository.getEndedGames(take, publicId)));
            return;
        }

        throw new HttpError(400, 'Unexpected ?type= value');
    });

    router.post('/api/games', authenticated, async (req, res) => {
        const gameOptions = sanitizeGameOptions(req.body);
        const host = res.locals.playerData;
        let opponent: null | PlayerData = null;

        if ('ai' === gameOptions.opponent.type) {
            opponent = createAIPlayer(gameOptions);
        }

        const hostedGame = await hostedGameRepository.createGame(host, gameOptions, opponent);

        res.send(normalize(hostedGame.toData()));
    });

    router.get('/api/games/:id', async (req, res) => {
        const game = await hostedGameRepository.getGame(req.params.id);

        if (null === game) {
            throw new HttpError(404, 'Game not found');
        }

        res.send(normalize(game));
    });

    return router;
};
