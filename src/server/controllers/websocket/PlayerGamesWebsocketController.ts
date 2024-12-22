import HostedGameRepository from '../../repositories/HostedGameRepository';
import PlayerRepository from '../../repositories/PlayerRepository';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from '../../server';

@Service()
export default class PlayerGamesWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
        private playerRepository: PlayerRepository,
    ) {}

    onConnection(): void {}

    async onJoinRoom(socket: HexSocket, room: string)
    {
        const playerId = room.match(/players\/([^/]+)\/games/)?.[1];
        if (playerId == null) return;
        const player = await this.playerRepository.getPlayer(playerId);
        if (player == null) return;
        const games = this.hostedGameRepository.getPlayerActiveGames(player)
            .map(g => g.getHostedGame());
        socket.emit('playerGamesUpdate', games);
    }
}
