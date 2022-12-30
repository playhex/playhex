import { Game, GameLoop, Move, PlayerIndex } from '../shared/game-engine';
import { GameInstanceData } from '../shared/Types';
import { Server, Socket } from 'socket.io';
import SocketPlayer from './SocketPlayer';
import { v4 as uuidv4 } from 'uuid';

export default class GameServerSocket
{
    private id: string = uuidv4();

    constructor(
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

    getId(): string
    {
        return this.id;
    }

    getGame(): Game
    {
        return this.game;
    }

    listenGame(): void
    {
        this.game.on('started', () => {
            this.io.to(`games/${this.id}`).emit('gameStarted', this.id);
        });

        this.game.on('played', (move, byPlayerIndex) => {
            this.io.to(`games/${this.id}`).emit('moved', this.id, move, byPlayerIndex);
        });

        this.game.on('ended', (winner: PlayerIndex) => {
            this.io.to(`games/${this.id}`).emit('ended', this.id, winner);
        });
    }

    playerJoin(socket: Socket, playerIndex: PlayerIndex): boolean
    {
        const player = this.game.getPlayers()[playerIndex];

        if (!(player instanceof SocketPlayer)) {
            console.log('Trying to join a slot that is not a SocketPlayer:', player);
            return false;
        }

        const playerSocket = player.getSocket();
        const playerId = player.getPlayerId();

        // Already joined by same socket (me), noop
        if (null !== playerSocket && playerSocket.id === socket.id) {
            return true;
        }

        // Joining a free slot
        if (null === playerId) {

            // Prevent a player from joining as his own opponent
            const opponent = this.game.getPlayers()[1 - playerIndex];
            let opponentId: null|string;

            if (
                opponent instanceof SocketPlayer
                && (opponentId = opponent.getPlayerId())
                && opponentId === socket.handshake.auth.playerId
            ) {
                console.log('Trying to join as own opponent');
                return false;
            }

            this.setSocketPlayer(socket, playerIndex);

            return true;
        }

        // Can join only if it's my slot
        if (playerId !== socket.handshake.auth.playerId) {
            return false;
        }

        this.setSocketPlayer(socket, playerIndex);

        return true;
    }

    playerMove(socket: Socket, move: Move): boolean
    {
        const player = this.game.getPlayers().find(player => {
            if (!(player instanceof SocketPlayer)) {
                return false;
            }

            return player.getPlayerId() === socket.handshake.auth.playerId;
        });

        if (!(player instanceof SocketPlayer)) {
            console.log('A player not in the game tryed to make a move', socket.handshake.auth);
            return false;
        }

        player.doMove(move);

        return true;
    }

    private setSocketPlayer(socket: Socket, playerIndex: PlayerIndex): void
    {
        const player = this.game.getPlayer(playerIndex);

        if (!(player instanceof SocketPlayer)) {
            throw new Error('Trying to set a socket on a non-SocketPlayer');
        }

        player.setPlayerData({
            id: socket.handshake.auth.playerId,
        });

        player.setSocket(socket);
    }

    toData(): GameInstanceData
    {
        return {
            id: this.id,
            game: this.game.toData(),
        };
    }
}
