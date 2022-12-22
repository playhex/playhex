import { Game, PlayerIndex } from '../shared/game-engine';
import { Server, Socket } from 'socket.io';
import { EventsMap } from 'socket.io/dist/typed-events';
import GameServerSocket from './GameServerSocket';

export class HexServer
{
    private gameServerSockets: {[key: string]: GameServerSocket} = {};

    public constructor(
        private io: Server<EventsMap, EventsMap>,
    ) {
        io.on('connection', socket => {
            socket.on('createGame', (answer: (gameId: string) => void) => {
                const game = this.createGame();
                answer(game.getId());
            });

            socket.on('joinGame', (gameId: string, playerIndex: PlayerIndex, answer: (joined: boolean) => void) => {
                const joined = this.playerJoinGame(socket, gameId, playerIndex);
                answer(joined);
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

    public createGame(): GameServerSocket
    {
        const game = new Game();
        const gameServerSocket = new GameServerSocket(this.io, game);
        this.gameServerSockets[gameServerSocket.getId()] = gameServerSocket;
        this.io.emit('gameCreated', gameServerSocket.toGameData());

        return gameServerSocket;
    }

    public playerJoinGame(socket: Socket, gameId: string, playerIndex: PlayerIndex): boolean
    {
        const gameServerSocket = this.gameServerSockets[gameId];

        console.log('playerJoinGame', arguments);
        console.log(this.gameServerSockets, 'trying to join', gameServerSocket);

        if (!gameServerSocket) {
            return false;
        }

        return gameServerSocket.playerJoin(socket, playerIndex);
    }
}
