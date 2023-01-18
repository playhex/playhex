import { Game, Move, PlayerIndex } from '../shared/game-engine';
import { Server } from 'socket.io';
import GameServerSocket from './GameServerSocket';
import { MoveData, PlayerData } from '../shared/app/Types';
import ServerPlayer from './ServerPlayer';
import { HexClientToServerEvents, HexServerToClientEvents } from '@shared/app/HexSocketEvents';
import { v4 as uuidv4 } from 'uuid';

/**
 * Contains server state,
 * listens all socket events,
 * dispatch game events to dedicated GameServerSocket.
 */
export class HexServer
{
    private gameServerSockets: {[key: string]: GameServerSocket} = {};
    private players: {[key: string]: PlayerData} = {};

    constructor(
        private io: Server<HexClientToServerEvents, HexServerToClientEvents>,
    ) {
        io.on('connection', socket => {
            console.log('New socket connection', socket.request.session);

            socket.on('createGame', answer => {
                const gameSocketServer = this.createGame();
                answer(gameSocketServer.getId());
            });

            socket.on('joinGame', (gameId, playerIndex, answer) => {
                const joined = this.playerJoinGame(socket.request.session.playerId, gameId, playerIndex);
                answer(joined);
            });

            socket.on('room', (join, room) => {
                console.log(`Room: player ${socket.request.session.playerId} ${join} room ${room}`);
                socket[join](room);
            });

            socket.on('move', (gameId, move, answer) => {
                answer(this.playerMove(socket.request.session.playerId, gameId, move));
            });
        });
    }

    getPlayer(playerId: string): null | PlayerData
    {
        return this.players[playerId] || null;
    }

    getGames()
    {
        return this.gameServerSockets;
    }

    getGame(id: string): null|GameServerSocket
    {
        return this.gameServerSockets[id] ?? null;
    }

    createGame(
        game: Game = new Game([
            new ServerPlayer(),
            new ServerPlayer(),
        ]),
    ): GameServerSocket {
        const gameServerSocket = new GameServerSocket(this.io, game);
        this.gameServerSockets[gameServerSocket.getId()] = gameServerSocket;
        this.io.emit('gameCreated', gameServerSocket.toData());

        return gameServerSocket;
    }

    playerJoinGame(playerId: string, gameId: string, playerIndex: PlayerIndex): true | string
    {
        const gameServerSocket = this.gameServerSockets[gameId];

        if (!gameServerSocket) {
            return 'no game ' + gameId;
        }

        const playerData = this.players[playerId];

        if (!playerData) {
            return 'no player ' + playerId;
        }

        const joined = gameServerSocket.playerJoin(playerData, playerIndex);

        if (true === joined) {
            this.io.to(`games/${gameId}`).emit('gameJoined', gameId, playerIndex, playerData);
        }

        return joined;
    }

    playerMove(playerId: string, gameId: string, move: MoveData): true|string
    {
        const gameServerSocket = this.gameServerSockets[gameId];

        if (!gameServerSocket) {
            return 'no game ' + gameId;
        }

        const playerData = this.players[playerId];

        if (!playerData) {
            return 'no player' + playerId;
        }

        return gameServerSocket.playerMove(playerData, new Move(move.row, move.col));
    }

    createGuest(): PlayerData
    {
        const guest: PlayerData = {
            id: uuidv4(),
            isGuest: true,
            pseudo: 'Guest ' + (1000 + Math.floor(Math.random() * 9000)),
        };

        return this.players[guest.id] = guest;
    }
}
