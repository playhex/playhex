import { json } from 'body-parser';
import { Router } from 'express';
import { PlayerData } from '@shared/app/Types';
import { Game, Player } from '../../../shared/game-engine';
import { sanitizeGameOptions } from '../../../shared/app/GameOptions';
import { shufflePlayers } from '../../../shared/app/GameUtils';
import { HexServer } from '../../HexServer';
import ServerPlayer from '../../ServerPlayer';
import { createAIPlayer } from '../../AIPlayersManager';
import Container from 'typedi';

export default (): Router => {
    const router = Router();
    const hexServer = Container.get(HexServer);

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

        const gameOptions = sanitizeGameOptions(req.body);

        const players: [ServerPlayer, ServerPlayer] = [
            new ServerPlayer().setPlayerData(playerData),
            new ServerPlayer(),
        ];

        shufflePlayers(players, gameOptions.firstPlayer);

        const game = new Game(players, gameOptions.boardsize);
        const gameServerSocket = hexServer.createGame(game);

        res.send(gameServerSocket.toData());
    });

    router.post('/api/games/cpu', (req, res) => {
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = hexServer.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const gameOptions = sanitizeGameOptions(req.body);

        const players: [Player, Player] = [
            new ServerPlayer().setPlayerData(playerData),
            createAIPlayer(gameOptions),
        ];

        shufflePlayers(players, gameOptions.firstPlayer);

        const game = new Game(players, gameOptions.boardsize);
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

    router.post('/api/games/:id/resign', (req, res) => {
        const {id} = req.params;
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = hexServer.getPlayer(req.session.playerId))) {
            res.status(403).send('not authenticated').end();
            return;
        }

        const result = hexServer.playerResign(playerData.id, id);

        if (true !== result) {
            res.status(400).send(result);
        }

        res.status(204).send();
    });

    return router;
};
