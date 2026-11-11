import { Service } from 'typedi';
import LiveLobbyHistoryRepository from '../repositories/LiveLobbyHistoryRepository.js';
import { computeJoinChancesByUtcHour, type JoinChances } from './lobbyWaitStats.js';

/**
 * How far back lobby history is used to compute stats.
 */
const HISTORY_DEPTH_MS = 56 * 86400 * 1000;

/**
 * Stats are recomputed at most once per this delay.
 */
const LOBBY_WAIT_STATS_CACHE_MS = 7 * 86400 * 1000;

/**
 * Stats shown to a host waiting for an opponent,
 * to let him know his chances to be joined.
 */
@Service()
export default class LobbyWaitStatsService
{
    private joinChancesByUtcHour: null | JoinChances[] = null;
    private computedAt = 0;
    private computing: null | Promise<JoinChances[]> = null;

    constructor(
        private liveLobbyHistoryRepository: LiveLobbyHistoryRepository,
    ) {}

    /**
     * Chances to get a live lobby game joined, for each UTC hour of day (index 0 to 23).
     */
    async getJoinChancesByUtcHour(): Promise<JoinChances[]>
    {
        if (this.joinChancesByUtcHour !== null && Date.now() - this.computedAt < LOBBY_WAIT_STATS_CACHE_MS) {
            return this.joinChancesByUtcHour;
        }

        this.computing ??= (async () => {
            try {
                const { games } = await this.liveLobbyHistoryRepository.getLiveLobbyHistory(new Date(Date.now() - HISTORY_DEPTH_MS));

                this.joinChancesByUtcHour = computeJoinChancesByUtcHour(games);
                this.computedAt = Date.now();

                return this.joinChancesByUtcHour;
            } finally {
                this.computing = null;
            }
        })();

        return await this.computing;
    }
}
