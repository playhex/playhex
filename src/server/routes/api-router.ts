import bodyParser from 'body-parser';
import { Router } from 'express';
import { HexServer } from '@server/HexServer';

export function apiRouter(hexServer: HexServer) {
    const router = Router();
    router.use(bodyParser.json());

    router.get('/api/games', (req, res) => {
        res.send(Object.keys(hexServer.getGames()));
    });

    router.post('/api/games', (req, res) => {
        const game = hexServer.createGame();

        res.send(JSON.stringify(game.getId()));
    });

    return router;
}
