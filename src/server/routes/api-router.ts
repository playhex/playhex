import bodyParser from 'body-parser';
import { Router } from 'express';
import { HexServer } from '@server/HexServer';
import { Game, Player } from '../../shared/game-engine';
import ServerPlayer from '../ServerPlayer';
import { PlayerData } from '@shared/app/Types';
import { createAIPlayer } from '../AIPlayersManager';

export function apiRouter(hexServer: HexServer) {
    const router = Router();
    router.use(bodyParser.json());

    router.get('/api/games', (req, res) => {
        res.send(
            Object.values(hexServer.getGames()).map(hostedGame => hostedGame.toData())
        );
    });

    router.post('/api/games/1v1', (req, res) => {
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = hexServer.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const players: [ServerPlayer, ServerPlayer] = [
            new ServerPlayer().setPlayerData(playerData),
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
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = hexServer.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const players: [Player, Player] = [
            new ServerPlayer().setPlayerData(playerData),
            createAIPlayer(),
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

    router.post('/auth/guest', (req, res) => {
        let user: null | PlayerData = null;

        if (req.session.playerId) {
            user = hexServer.getPlayer(req.session.playerId);
        }

        if (null === user) {
            user = hexServer.createGuest();
        }

        req.session.playerId = user.id;

        res.send(user).end();
    });

    router.all('/api/**', (req, res) => {
        res.sendStatus(404);
    });

    return router;
}
