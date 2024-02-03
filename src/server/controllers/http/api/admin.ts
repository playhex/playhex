import { Router } from 'express';
import Container from 'typedi';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { isAdmin } from '../middlewares';

export default (): Router => {
    const router = Router();
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.post('/api/admin/persist-games', isAdmin, async (req, res) => {
        await hostedGameRepository.persistPlayingGames();

        res.status(204).send();
    });

    return router;
};
