import bodyParser from 'body-parser';
import { Router } from 'express';
import { HexServer } from '@server/HexServer';
import { Game, PlayerInterface, RandomAIPlayer } from '../../shared/game-engine';
import SocketPlayer from '../SocketPlayer';

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

    router.post('/api/games/1v1', (req, res) => {
        const players: [PlayerInterface, PlayerInterface] = [
            new SocketPlayer(),
            new SocketPlayer(),
        ];

        if (Math.random() < 0.5) {
            players.reverse();
        }

        const game = new Game(players);
        const gameServerSocket = hexServer.createGame(game);

        res.send(gameServerSocket.toData());
    });

    router.post('/api/games/cpu', (req, res) => {
        const players: [PlayerInterface, PlayerInterface] = [
            new RandomAIPlayer(),
            new SocketPlayer(),
        ];

        if (Math.random() < 0.5) {
            players.reverse();
        }

        const game = new Game(players);
        const gameServerSocket = hexServer.createGame(game);

        res.send(gameServerSocket.toData());
    });

    router.get('/api/games/:id', (req, res) => {
        const {id} = req.params;
        const game = hexServer.getGame(id)

        if (null === game) {
            res.sendStatus(404);
            return;
        }

        res.send(game.toData());
    });

    router.all('/api/**', (req, res) => {
        res.sendStatus(404);
    });

    return router;
}
