import { Service } from 'typedi';
import HostedGame from '../HostedGame';
import { Game, Move } from "../../shared/game-engine";
import ServerPlayer from "../ServerPlayer";
import PlayerRepository from "./PlayerRepository";
import { MoveData } from "../../shared/app/Types";
import { HexServer } from "../server";

@Service()
export default class HostedGameRepository
{
    private hostedGames: {[key: string]: HostedGame} = {};

    constructor(
        private io: HexServer,
        private playerRepository: PlayerRepository,
    ) {}

    getGames()
    {
        return this.hostedGames;
    }

    getGame(id: string): null|HostedGame
    {
        return this.hostedGames[id] ?? null;
    }

    createGame(
        game: Game = new Game([
            new ServerPlayer(),
            new ServerPlayer(),
        ]),
    ): HostedGame {
        const gameServerSocket = new HostedGame(this.io, game);
        this.hostedGames[gameServerSocket.getId()] = gameServerSocket;
        this.io.to('lobby').emit('gameCreated', gameServerSocket.toData());

        return gameServerSocket;
    }

    playerJoinGame(playerId: string, gameId: string): true | string
    {
        const gameServerSocket = this.hostedGames[gameId];

        if (!gameServerSocket) {
            return 'no game ' + gameId;
        }

        const playerData = this.playerRepository.getPlayer(playerId);

        if (!playerData) {
            return 'no player ' + playerId;
        }

        const joinResult = gameServerSocket.playerJoin(playerData);

        if ('string' === typeof joinResult) {
            return joinResult;
        }

        this.io.to(`games/${gameId}`).emit('gameJoined', gameId, joinResult, playerData);

        return true;
    }

    playerMove(playerId: string, gameId: string, move: MoveData): true|string
    {
        const gameServerSocket = this.hostedGames[gameId];

        if (!gameServerSocket) {
            return 'no game ' + gameId;
        }

        const playerData = this.playerRepository.getPlayer(playerId);

        if (!playerData) {
            return 'no player' + playerId;
        }

        return gameServerSocket.playerMove(playerData, new Move(move.row, move.col));
    }

    playerResign(playerId: string, gameId: string): true|string
    {
        const gameServerSocket = this.hostedGames[gameId];

        if (!gameServerSocket) {
            return 'no game ' + gameId;
        }

        const playerData = this.playerRepository.getPlayer(playerId);

        if (!playerData) {
            return 'no player' + playerId;
        }

        return gameServerSocket.playerResign(playerData);
    }
}
