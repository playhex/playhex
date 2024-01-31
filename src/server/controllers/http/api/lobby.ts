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

    router.get('/api/games', (req, res) => {
        res.send(normalize(
            Object.values(hostedGameRepository.getGames()).map(hostedGame => hostedGame.toData())
        ));
    });

    router.post('/api/games', authenticated, async (req, res) => {
        const gameOptions = sanitizeGameOptions(req.body);
        const host = res.locals.playerData;
        let opponent: null | PlayerData = null;

        if ('ai' === gameOptions.opponent.type) {
            opponent = createAIPlayer(gameOptions);
        }

        const hostedGame = hostedGameRepository.createGame(host, gameOptions, opponent);

        res.send(normalize(hostedGame.toData()));
    });

    router.get('/api/games/:id', (req, res) => {
        const game = hostedGameRepository.getGame(req.params.id);

        if (null === game) {
            throw new HttpError(404, 'Game not found');
        }

        res.send(normalize(game.toData()));
    });

    return router;
};
