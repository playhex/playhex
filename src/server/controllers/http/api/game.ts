import { Router } from 'express';
import { PlayerData } from '@shared/app/Types';
import Container from 'typedi';
import PlayerRepository from "../../../repositories/PlayerRepository";
import HostedGameRepository from "../../../repositories/HostedGameRepository";

export default (): Router => {
    const router = Router();
    const playerRepository = Container.get(PlayerRepository);
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.post('/api/games/:id/resign', (req, res) => {
        const {id} = req.params;
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = playerRepository.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const result = hostedGameRepository.playerResign(playerData.id, id);

        if (true !== result) {
            res.status(400).send(result);
        }

        res.status(204).send();
    });

    return router;
};
