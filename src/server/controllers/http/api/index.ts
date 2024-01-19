import { json, Router } from 'express';
import lobbyRoutes from './lobby';
import gameRoutes from './game';
import playerRoutes from './player';
import authRoutes from './auth';
import onlinePlayersRoutes from './onlinePlayers';

export default function apiRouter() {
    const router = Router();

    router.use(json());

    router.use(playerRoutes());
    router.use(gameRoutes());
    router.use(lobbyRoutes());
    router.use(authRoutes());
    router.use(onlinePlayersRoutes());

    router.all('/api/**', (req, res) => {
        res.status(404).send({
            error: `Route ${req.method} ${req.originalUrl} not found.`,
        });
    });

    return router;
}
