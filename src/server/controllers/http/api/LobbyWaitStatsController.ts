import { JsonController, Get, Header } from 'routing-controllers';
import { Service } from 'typedi';
import LobbyWaitStatsService from '../../../services/LobbyWaitStatsService.js';

@JsonController()
@Service()
export default class LobbyWaitStatsController
{
    constructor(
        private lobbyWaitStatsService: LobbyWaitStatsService,
    ) {}

    /**
     * Hints for a host waiting for an opponent to join his live game.
     * Cached 24h by browser, stats are also cached 24h server side.
     */
    @Get('/api/lobby-wait-stats')
    @Header('Cache-Control', 'public, max-age=86400')
    async getLobbyWaitStats(): Promise<{ typicalJoinMsByUtcHour: (null | number)[] }>
    {
        return {
            typicalJoinMsByUtcHour: await this.lobbyWaitStatsService.getTypicalJoinMsByUtcHour(),
        };
    }
}
