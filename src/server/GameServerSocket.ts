import { Game, GameLoop, PlayerIndex } from '../shared/game-engine';
import { GameData, PlayerData } from '../shared/Types';
import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';
import NullPlayer from '../shared/game-engine/NullPlayer';
import SocketPlayer from './SocketPlayer';

export default class GameServerSocket
{
    private id: string = randomUUID();
    private game: Game;
    private gameStarted: boolean = false;

    public constructor()
    {
        this.game = new Game([
            new SocketPlayer(),
            new SocketPlayer(),
        ]);
    }

    public getId(): string
    {
        return this.id;
    }

    public start(): void
    {
        if (this.gameStarted) {
            throw new Error('game already started');
        }

        if (!this.game.getPlayers().every(player => player.isReady())) {
            throw new Error('cannot start, at least one player not ready');
        }

        this.gameStarted = true;

        GameLoop.run(this.game);
    }

    public playerJoin(socket: Socket, playerIndex: PlayerIndex): boolean
    {
        const player = this.game.getPlayers()[playerIndex];

        if (this.gameStarted) {
            console.log('Trying to join but game already started');
            return false;
        }

        if (!(player instanceof SocketPlayer)) {
            console.log('Trying to join a slot that is not a SocketPlayer:', player);
            return false;
        }

        // Already joined by same socket (me), noop
        if (null !== player.socket && player.socket.id === socket.id) {
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

    private setSocketPlayer(socket: Socket, playerIndex: PlayerIndex): void
    {
        const player = this.game.getPlayer(playerIndex);

        if (!(player instanceof SocketPlayer)) {
            throw new Error('Trying to set a socket on a non-SocketPlayer');
        }

        player.socket = socket;
        player.playerData = {
            id: socket.handshake.auth.playerId,
        };
    }

    public toGameData(): GameData
    {
        return {
            id: this.id,
            players: this.game.getPlayers().map(player => {
                if (!(player instanceof SocketPlayer)) {
                    throw new Error('non-SocketPlayer not yet supported');
                }

                return {
                    id: player.playerData?.id ?? '(free slot)',
                };
            }) as [PlayerData, PlayerData],
        };
    }
}
