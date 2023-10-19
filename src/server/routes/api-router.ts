import { json } from 'body-parser';
import { Router } from 'express';
import gamesRoutes from '../controllers/api/games';
import authRoutes from '../controllers/api/auth';

export function apiRouter() {
    const router = Router();

    router.use(json());

    router.use(gamesRoutes());
    router.use(authRoutes());

    router.all('/api/**', (req, res) => {
        res.sendStatus(404);
    });

    return router;
}
