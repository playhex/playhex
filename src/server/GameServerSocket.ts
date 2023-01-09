import { Game, IllegalMove, Move, Player, PlayerIndex } from '../shared/game-engine';
import { GameData, HostedGameData, PlayerData } from '../shared/app/Types';
import { Server, Socket } from 'socket.io';
import ServerPlayer from './ServerPlayer';
import { v4 as uuidv4 } from 'uuid';
import { HexClientToServerEvents, HexServerToClientEvents } from '@shared/app/HexSocketEvents';

/**
 * Contains a game state,
 * mutate this, and notify obervers in the room.
 */
export default class GameServerSocket
{
    private id: string = uuidv4();

    constructor(
        private io: Server<HexClientToServerEvents, HexServerToClientEvents>,
        private game: Game,
    ) {
        this.listenGame();
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

        if (!(player instanceof ServerPlayer)) {
            console.log('Trying to join a slot that is not a ServerPlayer:', player);
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
                opponent instanceof ServerPlayer
                && (opponentId = opponent.getPlayerId())
                && opponentId === socket.handshake.auth.playerId
            ) {
                console.log('Trying to join as own opponent');
                return false;
            }

            this.setServerPlayer(socket, playerIndex);

            return true;
        }

        // Can join only if it's my slot
        if (playerId !== socket.handshake.auth.playerId) {
            return false;
        }

        this.setServerPlayer(socket, playerIndex);

        return true;
    }

    playerMove(socket: Socket, move: Move): true | string
    {
        const player = this.game.getPlayers().find(player => {
            if (!(player instanceof ServerPlayer)) {
                return false;
            }

            return player.getPlayerId() === socket.handshake.auth.playerId;
        });

        if (!(player instanceof Player)) {
            console.log('A player not in the game tried to make a move', socket.handshake.auth);
            return 'you are not a player of this game';
        }

        try {
            player.move(move);

            return true;
        } catch (e) {
            if (e instanceof IllegalMove) {
                return e.message;
            }

            console.error(e.message);

            return 'Unexpected error: ' + e.message;
        }
    }

    private setServerPlayer(socket: Socket, playerIndex: PlayerIndex): void
    {
        const player = this.game.getPlayer(playerIndex);

        if (!(player instanceof ServerPlayer)) {
            throw new Error('Trying to set a socket on a non-ServerPlayer');
        }

        player.setPlayerData({
            id: socket.handshake.auth.playerId,
        });

        player.setSocket(socket);
    }

    toData(): HostedGameData
    {
        return {
            id: this.id,
            game: GameServerSocket.gameToData(this.game),
        };
    }

    private static gameToData(game: Game): GameData
    {
        return {
            players: game.getPlayers().map(player => ({id: player.getName()})) as [PlayerData, PlayerData],
            size: game.getSize(),
            started: game.isStarted(),
            currentPlayerIndex: game.getCurrentPlayerIndex(),
            winner: game.getWinner(),
            hexes: game.getCells().map(
                row => row
                    .map(
                        cell => null === cell
                            ? '.' :
                            (cell
                                ? '1'
                                : '0'
                            ),
                    )
                    .join('')
                ,
            ),
        };
    }
}
