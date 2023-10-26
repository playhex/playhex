import { Container } from 'typedi';
import { Router } from 'express';
import { PlayerData } from '@shared/app/Types';
import PlayerRepository from '../../../repositories/PlayerRepository';

export default (): Router => {
    const router = Router();
    const playerRepository = Container.get(PlayerRepository);

    router.post('/auth/guest', (req, res) => {
        let user: null | PlayerData = null;

        if (req.session.playerId) {
            user = playerRepository.getPlayer(req.session.playerId);
        }

        if (null === user) {
            user = playerRepository.createGuest();
        }

        req.session.playerId = user.id;

        res.send(user).end();
    });

    return router;
};
