import { Container } from 'typedi';
import { Router, json } from 'express';
import PlayerSettingsRepository from '../../../repositories/PlayerSettingsRepository';
import { authenticated } from '../middlewares';

export default (): Router => {
    const router = Router();
    const playerSettingsRepository = Container.get(PlayerSettingsRepository);

    router.get('/api/player-settings', authenticated, async (req, res) => {
        const playerSettingsData = await playerSettingsRepository.getPlayerSettings(res.locals.playerData.publicId);

        res.send(playerSettingsData).end();
    });

    router.patch('/api/player-settings', authenticated, json(), async (req, res) => {
        const playerSettingsData = await playerSettingsRepository.updatePlayerSettings(res.locals.playerData.publicId, req.body);

        res.send(playerSettingsData).end();
    });

    return router;
};
