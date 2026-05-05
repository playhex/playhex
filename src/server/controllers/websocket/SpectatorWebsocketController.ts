import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import { hasPlayer } from '../../../shared/app/hostedGameUtils.js';
import { GameEventsEmitter } from '../../services/game-events-emitter/GameEventsEmitter.js';
import { GameSpectators } from '../../services/GameSpectators.js';

@Service()
export default class SpectatorWebsocketController implements WebsocketControllerInterface
{

    constructor(
        private gameSpectators: GameSpectators,
        private hostedGameRepository: HostedGameRepository,
        private gameEventsEmitter: GameEventsEmitter,
    ) {}

    onJoinRoom(socket: HexSocket, room: string): void
    {
        const gameId = room.match(/^games\/(.+)$/)?.[1];
        if (gameId == null) return;

        this.handleSpectatorJoin(socket, gameId);
        socket.emit('spectatorUpdate', gameId, this.gameSpectators.getSpectatorPlayers(gameId));
    }

    onLeaveRoom(socket: HexSocket, room: string): void
    {
        const gameId = room.match(/^games\/(.+)$/)?.[1];
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

        if (this.gameSpectators.addSpectator(gameId, player)) {
            this.gameEventsEmitter.emitSpectatorJoined(gameId, player);
        }
    }

    private handleSpectatorLeave(socket: HexSocket, gameId: string): void
    {
        const { player } = socket.data;
        if (player === null) return;

        if (this.gameSpectators.removeSpectator(gameId, player)) {
            this.gameEventsEmitter.emitSpectatorLeft(gameId, player);
        }
    }
}
