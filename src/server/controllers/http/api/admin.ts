import { Router } from 'express';
import Container from 'typedi';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { isAdmin } from '../middlewares';
import HttpError from '../HttpError';

export default (): Router => {
    const router = Router();
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.post('/api/admin/persist-games', isAdmin, async (req, res) => {
        const allSuccess = await hostedGameRepository.persistPlayingGames();

        if (!allSuccess) {
            throw new HttpError(500, 'Some games could not be persisted');
        }

        res.status(204).send();
    });

    return router;
};
