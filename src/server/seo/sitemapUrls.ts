import type { Tournament, TournamentSeries } from '../../shared/app/models/index.js';

export type SitemapUrl = {
    /**
     * Path from site root, e.g "/tournaments/my-tournament"
     */
    path: string;

    lastmod?: Date;
};

/**
 * Static pages worth indexing in search engines.
 */
export const staticSitemapUrls: SitemapUrl[] = [
    '/',
    '/guide',
    '/guide/ai-analysis',
    '/guide/conditional-moves',
    '/tutorial/rules',
    '/puzzles',
    '/tournaments',
    '/tournament-series',
    '/king-of-the-hill',
    '/hexplorer',
    '/swap-maps',
    '/videos',
    '/statistics',
    '/games-archive',
    '/export-games-data',
    '/tournoi-hex-paris-2025',
    '/tournoi-hex-paris-2026',
].map(path => ({ path }));

const latestDate = (dates: (null | undefined | Date)[]): undefined | Date => {
    let latest: undefined | Date;

    for (const date of dates) {
        if (date && (!latest || date > latest)) {
            latest = date;
        }
    }

    return latest;
};

/**
 * Last time tournament page content changed significantly: created, started, ended.
 */
export const tournamentLastmod = (tournament: Pick<Tournament, 'createdAt' | 'startedAt' | 'endedAt'>): undefined | Date =>
    latestDate([tournament.createdAt, tournament.startedAt, tournament.endedAt])
;

/**
 * Tournament pages, and tournament series pages
 * which change when one of their tournaments change.
 *
 * @param tournaments Indexable tournaments, with their series id
 */
export const tournamentsSitemapUrls = (
    tournaments: Pick<Tournament, 'slug' | 'createdAt' | 'startedAt' | 'endedAt' | 'series'>[],
    seriesList: Pick<TournamentSeries, 'id' | 'slug' | 'createdAt'>[],
): SitemapUrl[] => {
    const seriesLastmod = new Map<number, Date>();

    const tournamentUrls = tournaments.map((tournament): SitemapUrl => {
        const lastmod = tournamentLastmod(tournament);

        if (tournament.series && lastmod) {
            const current = seriesLastmod.get(tournament.series.id);

            if (!current || lastmod > current) {
                seriesLastmod.set(tournament.series.id, lastmod);
            }
        }

        return {
            path: `/tournaments/${encodeURIComponent(tournament.slug)}`,
            lastmod,
        };
    });

    const seriesUrls = seriesList.map((series): SitemapUrl => ({
        path: `/tournament-series/${encodeURIComponent(series.slug)}`,
        lastmod: latestDate([series.createdAt, seriesLastmod.get(series.id)]),
    }));

    return [...seriesUrls, ...tournamentUrls];
};
