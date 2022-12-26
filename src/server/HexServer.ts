import { Game, Move, PlayerIndex } from '../shared/game-engine';
import { Server, Socket } from 'socket.io';
import { EventsMap } from 'socket.io/dist/typed-events';
import GameServerSocket from './GameServerSocket';
import { MoveData, PlayerData } from '../shared/game-engine/Types';
import SocketPlayer from './SocketPlayer';

export class HexServer
{
    private gameServerSockets: {[key: string]: GameServerSocket} = {};

    public constructor(
        private io: Server<EventsMap, EventsMap>,
    ) {
        io.on('connection', socket => {
            socket.on('createGame', (answer: (gameId: string) => void) => {
                const gameSocketServer = this.createGame();
                answer(gameSocketServer.getId());
            });

            socket.on('joinGame', (gameId: string, playerIndex: PlayerIndex, answer: (joined: boolean) => void) => {
                const joined = this.playerJoinGame(socket, gameId, playerIndex);
                answer(joined);
            });

            socket.on('room', (join: 'join' | 'leave', room: string) => {
                console.log(`Room: player ${socket.handshake.auth.playerId} ${join} room ${room}`);
                socket[join](room);
            });

            socket.on('move', (gameId: string, move: MoveData, answer: (result: true|string) => void) => {
                answer(this.playerMove(socket, gameId, move));
            });
        });
    }

    public getGames()
    {
        return this.gameServerSockets;
    }

    public getGame(id: string): null|GameServerSocket
    {
        return this.gameServerSockets[id] ?? null;
    }

    public createGame(
        game: Game = new Game([
            new SocketPlayer(),
            new SocketPlayer(),
        ]),
    ): GameServerSocket {
        const gameServerSocket = new GameServerSocket(this.io, game);
        this.gameServerSockets[gameServerSocket.getId()] = gameServerSocket;
        this.io.emit('gameCreated', gameServerSocket.toData());

        return gameServerSocket;
    }

    public playerJoinGame(socket: Socket, gameId: string, playerIndex: PlayerIndex): boolean
    {
        const gameServerSocket = this.gameServerSockets[gameId];

        if (!gameServerSocket) {
            return false;
        }

        const joined = gameServerSocket.playerJoin(socket, playerIndex);

        if (joined) {
            const playerData: PlayerData = {
                id: socket.handshake.auth.playerId,
            };

            this.io.to(`games/${gameId}`).emit('gameJoined', gameId, playerIndex, playerData);
        }

        return joined;
    }

    public playerMove(socket: Socket, gameId: string, move: MoveData): true|string
    {
        const gameServerSocket = this.gameServerSockets[gameId];

        if (!gameServerSocket) {
            return 'game not found';
        }

        return gameServerSocket.playerMove(socket, new Move(move.row, move.col)) || 'wrong move';
    }
}
