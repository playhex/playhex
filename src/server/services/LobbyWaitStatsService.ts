import { Service } from 'typedi';
import LiveLobbyHistoryRepository from '../repositories/LiveLobbyHistoryRepository.js';
import { computeTypicalJoinMsByUtcHour } from './lobbyWaitStats.js';

/**
 * How far back lobby history is used to compute stats.
 */
const HISTORY_DEPTH_MS = 28 * 86400 * 1000;

/**
 * Stats are recomputed at most once per this delay.
 */
const LOBBY_WAIT_STATS_CACHE_MS = 7 * 86400 * 1000;

/**
 * Stats shown to a host waiting for an opponent,
 * to let him know how long it usually takes for a game to be joined.
 */
@Service()
export default class LobbyWaitStatsService
{
    private typicalJoinMsByUtcHour: null | (null | number)[] = null;
    private computedAt = 0;
    private computing: null | Promise<(null | number)[]> = null;

    constructor(
        private liveLobbyHistoryRepository: LiveLobbyHistoryRepository,
    ) {}

    /**
     * Typical (p60) time to get a live lobby game joined, for each UTC hour of day (index 0 to 23),
     * null for hours without enough data.
     */
    async getTypicalJoinMsByUtcHour(): Promise<(null | number)[]>
    {
        if (this.typicalJoinMsByUtcHour !== null && Date.now() - this.computedAt < LOBBY_WAIT_STATS_CACHE_MS) {
            return this.typicalJoinMsByUtcHour;
        }

        this.computing ??= (async () => {
            try {
                const { games } = await this.liveLobbyHistoryRepository.getLiveLobbyHistory(new Date(Date.now() - HISTORY_DEPTH_MS));

                this.typicalJoinMsByUtcHour = computeTypicalJoinMsByUtcHour(games);
                this.computedAt = Date.now();

                return this.typicalJoinMsByUtcHour;
            } finally {
                this.computing = null;
            }
        })();

        return await this.computing;
    }
}
