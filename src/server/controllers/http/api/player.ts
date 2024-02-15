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
            throw new HttpError(404, 'Player not found');
        }

        res.send(normalize(transformPlayer(playerData))).end();
    });

    router.get('/api/players/:publicId', async (req, res) => {
        const playerData = await playerRepository.getPlayer(req.params.publicId);

        if (null === playerData) {
            throw new HttpError(404, 'Player not found');
        }

        res.send(normalize(transformPlayer(playerData))).end();
    });

    router.get('/api/players/:playerId/games', async (req, res) => {
        const playerData = await playerRepository.getPlayer(req.params.playerId);

        if (null === playerData) {
            throw new HttpError(404, 'Player not found');
        }

        const { state: stateRaw, publicId } = req.query;
        let state: null | HostedGameState = null;

        if ('string' === typeof stateRaw && (stateRaw === 'created' || stateRaw === 'playing' || stateRaw === 'ended')) {
            state = stateRaw;
        }

        res.send(normalize(await hostedGameRepository.getPlayerGames(playerData, state, typeof publicId === 'string' ? publicId : null))).end();
    });

    return router;
};
