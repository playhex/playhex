import bodyParser from 'body-parser';
import { Router } from 'express';
import { HexServer } from '../HexServer';
import gamesRoutes from '../controllers/api/games';
import authRoutes from '../controllers/api/auth';

export function apiRouter(hexServer: HexServer) {
    const router = Router();
    router.use(bodyParser.json());

    router.use(gamesRoutes(hexServer));
    router.use(authRoutes(hexServer));

    router.all('/api/**', (req, res) => {
        res.sendStatus(404);
    });

    return router;
}
