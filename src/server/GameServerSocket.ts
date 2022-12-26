import { Game, GameLoop, Move, PlayerIndex, RandomAIPlayer } from '../shared/game-engine';
import { GameData, PlayerData } from '../shared/Types';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import SocketPlayer from './SocketPlayer';

export default class GameServerSocket
{
    private id: string = randomUUID();

    public constructor(
        private io: Server,
        private game = new Game([
            new SocketPlayer(),
            new SocketPlayer(),
            //new RandomAIPlayer(),
        ]),
    ) {
        this.listenGame();

        GameLoop.run(this.game);
    }

    public getId(): string
    {
        return this.id;
    }

    public listenGame(): void
    {
        this.game.on('started', () => {
            this.io.to(`games/${this.id}`).emit('gameStarted', this.id);
        });

        this.game.on('played', (move, byPlayerIndex) => {
            this.io.to(`games/${this.id}`).emit('moved', this.id, move, byPlayerIndex);
        });
    }

    public playerJoin(socket: Socket, playerIndex: PlayerIndex): boolean
    {
        const player = this.game.getPlayers()[playerIndex];

        if (!(player instanceof SocketPlayer)) {
            console.log('Trying to join a slot that is not a SocketPlayer:', player);
            return false;
        }

        const playerSocket = player.getSocket();

        // Already joined by same socket (me), noop
        if (null !== playerSocket && playerSocket.id === socket.id) {
            return true;
        }

        // Joining a free slot
        if (null === player.playerData) {

            // Prevent a player from joining as his own opponent
            const opponent = this.game.getPlayers()[1 - playerIndex];

            if (
                opponent instanceof SocketPlayer
                && null !== opponent.playerData
                && opponent.playerData.id === socket.handshake.auth.playerId
            ) {
                console.log('Trying to join as own opponent');
                return false;
            }

            this.setSocketPlayer(socket, playerIndex);

            return true;
        }

        const playerId = player.playerData.id;

        // Can join only if it's my slot
        if (playerId !== socket.handshake.auth.playerId) {
            return false;
        }

        this.setSocketPlayer(socket, playerIndex);

        return true;
    }

    public playerMove(socket: Socket, move: Move): boolean
    {
        const player = this.game.getPlayers().find(player => {
            if (!(player instanceof SocketPlayer)) {
                return false;
            }

            return player.playerData?.id === socket.handshake.auth.playerId;
        });

        if (!(player instanceof SocketPlayer)) {
            console.log('A player not in the game tryed to make a move', socket.handshake.auth);
            return false;
        }

        console.log('player', socket.handshake.auth.playerId, ' do move ', move);

        player.doMove(move);

        return true;
    }

    private setSocketPlayer(socket: Socket, playerIndex: PlayerIndex): void
    {
        const player = this.game.getPlayer(playerIndex);

        if (!(player instanceof SocketPlayer)) {
            throw new Error('Trying to set a socket on a non-SocketPlayer');
        }

        player.playerData = {
            id: socket.handshake.auth.playerId,
        };

        player.setSocket(socket);
    }

    public toGameData(): GameData
    {
        return {
            id: this.id,
            players: this.game.getPlayers().map(player => {
                if (player instanceof SocketPlayer) {
                    return {
                        id: player.playerData?.id ?? '(free slot)',
                    };
                }

                if (player instanceof RandomAIPlayer) {
                    return {
                        id: 'bot',
                    };
                }

                throw new Error('unhandled player type: ' + player.constructor.name);
            }) as [PlayerData, PlayerData],
        };
    }
}
