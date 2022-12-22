import { Game, GameLoop, PlayerIndex } from '../shared/game-engine';
import { GameData } from '../shared/Types';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';

type PlayerSocket = {
    playerId: string;
    socket: Socket;
};

export default class GameServerSocket
{
    private id: string = randomUUID();
    private playerSockets: [null|PlayerSocket, null|PlayerSocket] = [null, null];
    private gameStarted: boolean = false;

    public constructor(
        private io: Server,
        private game: Game,
    ) {}

    public getId(): string
    {
        return this.id;
    }

    public start(): void
    {
        if (this.gameStarted) {
            throw new Error('game already started');
        }

        if (this.playerSockets.some(playerSocket => null === playerSocket)) {
            throw new Error('cannot start, missing player');
        }

        this.gameStarted = true;

        GameLoop.run(this.game);
    }

    public playerJoin(socket: Socket, playerIndex: PlayerIndex): boolean
    {
        const playerSocket = this.playerSockets[playerIndex];

        if (this.gameStarted && !playerSocket) {
            throw new Error('game started but no socket');
        }

        // Joining a free slot
        if (null === playerSocket) {
            this.setPlayerSocket(socket, playerIndex);

            return true;
        }

        // Already joined by me currently, noop
        if (playerSocket.socket.id === socket.id) {
            return true;
        }

        const {playerId} = playerSocket;

        // Can join only if it's my slot
        if (playerId !== socket.handshake.auth.playerId) {
            return false;
        }

        this.setPlayerSocket(socket, playerIndex);

        return true;
    }

    private setPlayerSocket(socket: Socket, playerIndex: PlayerIndex): void
    {
        const playerSocket = this.playerSockets[playerIndex];

        if (null === playerSocket) {
            this.playerSockets[playerIndex] = {
                playerId: socket.handshake.auth.playerId,
                socket,
            };
        } else {
            playerSocket.playerId = socket.handshake.auth.playerId;
            playerSocket.socket = socket;
        }
    }

    public toGameData(): GameData
    {
        return {
            id: this.id,
            players: [
                {id: this.playerSockets[0]?.playerId || '...'},
                {id: this.playerSockets[1]?.playerId || '...'},
            ],
        };
    }
}
