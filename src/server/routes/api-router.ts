import bodyParser from 'body-parser';
import { Router } from 'express';
import { HexServer } from '@server/HexServer';
import { Game, Player, RandomAIPlayer } from '../../shared/game-engine';
import ServerPlayer from '../ServerPlayer';

export function apiRouter(hexServer: HexServer) {
    const router = Router();
    router.use(bodyParser.json());

    router.get('/api/games', (req, res) => {
        res.send(
            Object.values(hexServer.getGames()).map(hostedGame => hostedGame.toData())
        );
    });

    router.post('/api/games/1v1', (req, res) => {
        const players: [Player, Player] = [
            new ServerPlayer(),
            new ServerPlayer(),
        ];

        if (Math.random() < 0.5) {
            players.reverse();
        }

        const game = new Game(players);
        const gameServerSocket = hexServer.createGame(game);

        res.send(gameServerSocket.toData());
    });

    router.post('/api/games/cpu', (req, res) => {
        const players: [Player, Player] = [
            new RandomAIPlayer(),
            new ServerPlayer(),
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
