import { Router } from 'express';
import { PlayerData } from '@shared/app/Types';
import { Game, Player } from '../../../../shared/game-engine';
import { sanitizeGameOptions } from '../../../../shared/app/GameOptions';
import { shufflePlayers } from '../../../../shared/app/GameUtils';
import ServerPlayer from '../../../ServerPlayer';
import { createAIPlayer } from '../../../AIPlayersManager';
import Container from 'typedi';
import PlayerRepository from "../../../repositories/PlayerRepository";
import HostedGameRepository from "../../../repositories/HostedGameRepository";

export default (): Router => {
    const router = Router();
    const playerRepository = Container.get(PlayerRepository);
    const hostedGameRepository = Container.get(HostedGameRepository);

    router.get('/api/games', (req, res) => {
        res.send(
            Object.values(hostedGameRepository.getGames()).map(hostedGame => hostedGame.toData())
        );
    });

    router.post('/api/games/1v1', (req, res) => {
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = playerRepository.getPlayer(req.session.playerId))) {
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
        const gameServerSocket = hostedGameRepository.createGame(game);

        res.send(gameServerSocket.toData());
    });

    router.post('/api/games/cpu', (req, res) => {
        let playerData: null | PlayerData;

        if (!req.session.playerId || null === (playerData = playerRepository.getPlayer(req.session.playerId))) {
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
        const gameServerSocket = hostedGameRepository.createGame(game);

        res.send(gameServerSocket.toData());
    });

    router.get('/api/games/:id', (req, res) => {
        const {id} = req.params;
        const game = hostedGameRepository.getGame(id)

        if (null === game) {
            res.sendStatus(404);
            return;
        }

        res.send(game.toData());
    });

    return router;
};
