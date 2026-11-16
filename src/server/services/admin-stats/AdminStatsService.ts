import { Service } from 'typedi';
import AdminStatsRepository from '../../repositories/AdminStatsRepository.js';
import RedisOrMemoryCache from '../../ai-jobs/RedisOrMemoryCache.js';
import { ADMIN_STATS_HISTORY_MS, ADMIN_STATS_PERIODS, computeAdminStats, periodStart, type AdminStats, type AdminStatsPeriod } from './computeAdminStats.js';

/**
 * Stats are computed from heavy queries, recomputed at most once per this delay,
 * unless explicitly refreshed.
 */
const CACHE_TTL_SECONDS = 24 * 3600;

/**
 * Bump to invalidate cached stats when their format changes.
 */
const CACHE_VERSION = 'v2';

type AllPeriodsStats = Record<AdminStatsPeriod, AdminStats>;

/**
 * Admin stats: activity, acquisition, retention, lobby and games quality,
 * by day, week or 28 days, on last 2 years.
 */
@Service()
export default class AdminStatsService
{
    private cache = new RedisOrMemoryCache<AllPeriodsStats>('admin-stats', CACHE_TTL_SECONDS);

    constructor(
        private adminStatsRepository: AdminStatsRepository,
    ) {}

    /**
     * @param refresh Recompute instead of using cached stats
     */
    async getStats(period: AdminStatsPeriod, refresh = false): Promise<AdminStats>
    {
        if (!refresh) {
            const cached = await this.cache.get(CACHE_VERSION);

            if (cached !== null) {
                return cached[period];
            }
        }

        const stats = await this.cache.dedupe(CACHE_VERSION, async () => {
            const computed = await this.computeAllPeriods();

            await this.cache.trySet(CACHE_VERSION, computed);

            return computed;
        });

        return stats[period];
    }

    /**
     * Raw data are fetched once for all periods.
     */
    private async computeAllPeriods(): Promise<AllPeriodsStats>
    {
        const now = Date.now();

        // Earliest period start, for the longest period
        const since = new Date(periodStart(now - ADMIN_STATS_HISTORY_MS, '28d'));
        const data = await this.adminStatsRepository.getRawData(since);
        const stats = {} as AllPeriodsStats;

        for (const period of ADMIN_STATS_PERIODS) {
            stats[period] = computeAdminStats(data, period, now);
        }

        return stats;
    }
}
