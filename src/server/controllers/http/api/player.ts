import { Container } from 'typedi';
import { Router } from 'express';
import PlayerRepository from '../../../repositories/PlayerRepository';
import { normalize } from '../../../../shared/app/serializer';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { transformPlayer } from '../../../serialization/Player';
import HttpError from '../HttpError';
import { HostedGameState } from '@shared/app/Types';

export default (): Router => {
    const router = Router();
    const playerRepository = Container.get(PlayerRepository);
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.get('/api/players', async (req, res) => {
        const { slug } = req.query;

        if ('string' !== typeof slug) {
            throw new HttpError(400, '?slug=... must be passed');
        }

        const playerData = await playerRepository.getPlayerBySlug(slug);

        if (null === playerData) {
            res.sendStatus(404).end();
            return;
        }

        res.send(normalize(transformPlayer(playerData))).end();
    });

    router.get('/api/players/:publicId', async (req, res) => {
        const playerData = await playerRepository.getPlayer(req.params.publicId);

        if (null === playerData) {
            res.sendStatus(404).end();
            return;
        }

        res.send(normalize(transformPlayer(playerData))).end();
    });

    router.get('/api/players/:playerId/games', async (req, res) => {
        const playerData = await playerRepository.getPlayer(req.params.playerId);

        if (null === playerData) {
            res.sendStatus(404).end();
            return;
        }

        const { state: stateRaw } = req.query;
        let state: null | HostedGameState = null;

        if ('string' === typeof stateRaw && (stateRaw === 'created' || stateRaw === 'playing' || stateRaw === 'ended')) {
            state = stateRaw;
        }

        res.send(normalize(hostedGameRepository.getPlayerGames(playerData, state))).end();
    });

    return router;
};
