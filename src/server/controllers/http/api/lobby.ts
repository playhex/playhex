import { Router } from 'express';
import { PlayerData } from '@shared/app/Types';
import { sanitizeGameOptions } from '../../../../shared/app/GameOptions';
import AppPlayer from '../../../../shared/app/AppPlayer';
import { createAIPlayer } from '../../../services/AIManager';
import Container from 'typedi';
import PlayerRepository from '../../../repositories/PlayerRepository';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { normalize } from '../../../../shared/app/serializer';
import logger from '../../../services/logger';

export default (): Router => {
    const router = Router();
    const playerRepository = Container.get(PlayerRepository);
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.get('/api/games', (req, res) => {
        res.send(normalize(
            Object.values(hostedGameRepository.getGames()).map(hostedGame => hostedGame.toData())
        ));
    });

    router.post('/api/games', async (req, res) => {
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = await playerRepository.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const host = new AppPlayer(playerData);
        const gameOptions = sanitizeGameOptions(req.body);
        const hostedGame = hostedGameRepository.createGame(host, gameOptions);

        switch (gameOptions.opponent.type) {
            case 'player':
                // do nothing, let empty
                break;

            case 'ai':
                hostedGame.playerJoin(createAIPlayer(gameOptions));
                break;

            default:
                logger.error('Unexpected opponent type.', { type: gameOptions.opponent.type });
        }

        res.send(normalize(hostedGame.toData()));
    });

    router.get('/api/games/:id', (req, res) => {
        const { id } = req.params;
        const game = hostedGameRepository.getGame(id);

        if (null === game) {
            res.sendStatus(404);
            return;
        }

        res.send(normalize(game.toData()));
    });

    return router;
};
