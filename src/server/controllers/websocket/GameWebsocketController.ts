import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { hasPlayer } from '../../../shared/app/hostedGameUtils.js';

@Service()
export default class GameWebsocketController implements WebsocketControllerInterface
{
    /**
     * Tracks spectator socket counts per game per player.
     * gameId -> playerPublicId -> number of sockets
     */
    private spectators: Map<string, Map<string, number>> = new Map();

    constructor(
        private hostedGameRepository: HostedGameRepository,
        private io: HexServer,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('move', (gameId, move, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameRepository.playerMove(player, gameId, move));
        });

        socket.on('premove', (gameId, premove, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameRepository.playerPremove(player, gameId, premove));
        });

        socket.on('cancelPremove', (gameId, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameRepository.playerCancelPremove(player, gameId));
        });
    }

    async onJoinRoom(socket: HexSocket, room: string)
    {
        const gameId = room.match(/games\/(.+)/)?.[1];
        if (gameId == null) return;
        const game = await this.hostedGameRepository.getActiveOrArchivedGame(gameId);
        socket.emit('gameUpdate', gameId, game);

        this.handleSpectatorJoin(socket, gameId);
    }

    onLeaveRoom(socket: HexSocket, room: string): void
    {
        const gameId = room.match(/games\/(.+)/)?.[1];
        if (gameId == null) return;

        this.handleSpectatorLeave(socket, gameId);
    }

    private handleSpectatorJoin(socket: HexSocket, gameId: string): void
    {
        const { player } = socket.data;
        if (player === null) return;

        const activeGame = this.hostedGameRepository.getActiveGame(gameId);
        if (activeGame === null) return;

        if (hasPlayer(activeGame.getHostedGame(), player)) return;

        if (!this.spectators.has(gameId)) {
            this.spectators.set(gameId, new Map());
        }

        const gameSpectators = this.spectators.get(gameId)!;
        const currentCount = gameSpectators.get(player.publicId) ?? 0;
        gameSpectators.set(player.publicId, currentCount + 1);

        if (currentCount === 0) {
            this.io.to(Rooms.game(gameId)).emit('spectatorJoined', gameId, player);
        }
    }

    private handleSpectatorLeave(socket: HexSocket, gameId: string): void
    {
        const { player } = socket.data;
        if (player === null) return;

        const gameSpectators = this.spectators.get(gameId);
        if (!gameSpectators) return;

        const currentCount = gameSpectators.get(player.publicId) ?? 0;
        if (currentCount <= 0) return;

        if (currentCount === 1) {
            gameSpectators.delete(player.publicId);
            this.io.to(Rooms.game(gameId)).emit('spectatorLeft', gameId, player);
        } else {
            gameSpectators.set(player.publicId, currentCount - 1);
        }

        if (gameSpectators.size === 0) {
            this.spectators.delete(gameId);
        }
    }
}
