import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';
import { hasPlayer } from '../../../shared/app/hostedGameUtils.js';
import { Player } from '../../../shared/app/models/index.js';

@Service()
export default class SpectatorWebsocketController implements WebsocketControllerInterface
{
    /**
     * Tracks spectator socket counts per game per player.
     * gameId -> playerPublicId -> { player, count }
     */
    private spectators: Map<string, Map<string, { player: Player, count: number }>> = new Map();

    constructor(
        private hostedGameRepository: HostedGameRepository,
        private io: HexServer,
    ) {}

    onJoinRoom(socket: HexSocket, room: string): void
    {
        const gameId = room.match(/games\/(.+)/)?.[1];
        if (gameId == null) return;

        this.handleSpectatorJoin(socket, gameId);
        socket.emit('spectatorUpdate', gameId, this.getSpectatorPlayers(gameId));
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
        const entry = gameSpectators.get(player.publicId);

        if (entry) {
            entry.count += 1;
        } else {
            gameSpectators.set(player.publicId, { player, count: 1 });
            this.io.to(Rooms.game(gameId)).emit('spectatorJoined', gameId, player);
        }
    }

    private getSpectatorPlayers(gameId: string): Player[]
    {
        const gameSpectators = this.spectators.get(gameId);
        if (!gameSpectators) return [];
        return Array.from(gameSpectators.values()).map(entry => entry.player);
    }

    private handleSpectatorLeave(socket: HexSocket, gameId: string): void
    {
        const { player } = socket.data;
        if (player === null) return;

        const gameSpectators = this.spectators.get(gameId);
        if (!gameSpectators) return;

        const entry = gameSpectators.get(player.publicId);
        if (!entry) return;

        if (entry.count === 1) {
            gameSpectators.delete(player.publicId);
            this.io.to(Rooms.game(gameId)).emit('spectatorLeft', gameId, player);
        } else {
            entry.count -= 1;
        }

        if (gameSpectators.size === 0) {
            this.spectators.delete(gameId);
        }
    }
}
