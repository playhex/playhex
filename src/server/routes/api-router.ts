import bodyParser from 'body-parser';
import { Router } from 'express';
import { HexServer } from '@server/HexServer';

export function apiRouter(hexServer: HexServer) {
    const router = Router();
    router.use(bodyParser.json());

    router.get('/api/games', (req, res) => {
        res.send(
            Object
                .keys(hexServer.getGames())
                .map(id => ({id}))
            ,
        );
    });

    router.post('/api/games', (req, res) => {
        const game = hexServer.createGame();

        res.send(game.toGameData());
    });

    router.get('/api/games/:id', (req, res) => {
        const {id} = req.params;
        const game = hexServer.getGame(id)

        if (null === game) {
            res.sendStatus(404);
            return;
        }

        res.send(game.toGameData());
    });

    router.all('/api/**', (req, res) => {
        res.sendStatus(404);
    });

    return router;
}
