import { Container } from 'typedi';
import { Router, json } from 'express';
import PlayerRepository from '../../../repositories/PlayerRepository';
import PlayerSettingsRepository from '../../../repositories/PlayerSettingsRepository';
import { PlayerData } from '@shared/app/Types';

export default (): Router => {
    const router = Router();
    const playerRepository = Container.get(PlayerRepository);
    const playerSettingsRepository = Container.get(PlayerSettingsRepository);

    router.get('/api/player-settings', async (req, res) => {
        let playerData: null | PlayerData = null;

        if (!req.session.playerId || null === (playerData = await playerRepository.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const playerSettingsData = await playerSettingsRepository.getPlayerSettings(playerData.publicId);

        res.send(playerSettingsData).end();
    });

    router.patch('/api/player-settings', json(), async (req, res) => {
        let playerData: null | PlayerData = null;

        if (!req.session.playerId || null === (playerData = await playerRepository.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const playerSettingsData = await playerSettingsRepository.updatePlayerSettings(playerData.publicId, req.body);

        res.send(playerSettingsData).end();
    });

    return router;
};
