import { Container } from 'typedi';
import { json, Router } from 'express';
import PlayerRepository, { MustBeGuestError } from '../../../repositories/PlayerRepository';
import { authenticate } from '../../../services/security/authentication';
import { normalize } from '../../../../shared/app/serializer';
import { PlayerData } from '@shared/app/Types';
import { transformPlayer } from '../../../serialization/Player';

export default (): Router => {
    const router = Router();
    const playerRepository = Container.get(PlayerRepository);

    router.post('/api/auth/me-or-guest', async (req, res) => {
        let player: null | PlayerData = null;

        if (req.session.playerId) {
            player = await playerRepository.getPlayer(req.session.playerId);
        }

        if (null === player) {
            player = await playerRepository.createGuest();
        }

        req.session.playerId = player.publicId;

        res.send(normalize(transformPlayer(player))).end();
    });

    router.post('/api/auth/guest', async (req, res) => {
        const player = await playerRepository.createGuest();

        req.session.playerId = player.publicId;

        res.send(normalize(transformPlayer(player))).end();
    });

    router.post('/api/auth/signup', json(), async (req, res) => {
        const player = await playerRepository.createPlayer(req.body.pseudo, req.body.password);

        req.session.playerId = player.publicId;

        res.send(normalize(transformPlayer(player))).end();
    });

    router.post('/api/auth/signup-from-guest', json(), async (req, res) => {
        const { playerId } = req.session;

        if (!playerId) {
            throw new MustBeGuestError();
        }

        const player = await playerRepository.upgradeGuest(playerId, req.body.pseudo, req.body.password);

        res.send(normalize(transformPlayer(player))).end();

    });

    router.post('/api/auth/login', json(), async (req, res) => {
        const player = await authenticate(req.body.pseudo, req.body.password);

        req.session.playerId = player.publicId;

        res.send(normalize(transformPlayer(player))).end();
    });

    router.get('/api/auth/me', async (req, res) => {
        const { playerId } = req.session;

        if (!playerId) {
            res.sendStatus(403).end();
            return;
        }

        const player = await playerRepository.getPlayer(playerId);

        if (null === player) {
            res.sendStatus(403).end();
            return;
        }

        res.send(normalize(transformPlayer(player))).end();
    });

    router.delete('/api/auth/logout', async (req, res) => {
        req.session.regenerate(async (err) => {
            if (err) {
                throw new Error(err);
            }

            const player = await playerRepository.createGuest();

            req.session.playerId = player.publicId;

            res.send(normalize(transformPlayer(player))).end();
        });
    });

    return router;
};
