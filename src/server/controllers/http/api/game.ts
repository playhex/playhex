import { Router } from 'express';
import Container from 'typedi';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import { authenticated } from '../middlewares';
import HttpError from '../HttpError';

export default (): Router => {
    const router = Router();
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.post('/api/games/:id/resign', authenticated, async (req, res) => {
        const result = hostedGameRepository.playerResign(res.locals.playerData, req.params.id);

        if (true !== result) {
            throw new HttpError(400, result);
        }

        res.status(204).send();
    });

    router.post('/api/games/:id/cancel', authenticated, async (req, res) => {
        const result = hostedGameRepository.playerCancel(res.locals.playerData, req.params.id);

        if (true !== result) {
            throw new HttpError(400, result);
        }

        res.status(204).send();
    });

    router.post('/api/games/:id/move', authenticated, async (req, res) => {
        const result = hostedGameRepository.playerMove(res.locals.playerData, req.params.id, req.body);

        if (true !== result) {
            throw new HttpError(400, result);
        }

        res.status(204).send();
    });

    return router;
};
