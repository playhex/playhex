import assert from 'assert';
import { describe, it } from 'mocha';
import { Tournament, TournamentSeries } from '../../../shared/app/models/index.js';
import { tournamentsSitemapUrls } from '../../seo/sitemapUrls.js';

const createSeries = (id: number, slug: string, createdAt: string): TournamentSeries => Object.assign(new TournamentSeries(), {
    id,
    slug,
    createdAt: new Date(createdAt),
});

const createTournament = (slug: string, dates: { createdAt: string, startedAt?: string, endedAt?: string }, series: null | TournamentSeries = null): Tournament => Object.assign(new Tournament(), {
    slug,
    createdAt: new Date(dates.createdAt),
    startedAt: dates.startedAt ? new Date(dates.startedAt) : null,
    endedAt: dates.endedAt ? new Date(dates.endedAt) : null,
    series,
});

describe('sitemapUrls', () => {
    it('lists tournaments and series with their last modification date', () => {
        const weekly = createSeries(1, 'weekly', '2026-01-01T00:00:00Z');
        const empty = createSeries(2, 'empty series', '2026-02-01T00:00:00Z');

        const urls = tournamentsSitemapUrls([
            createTournament('weekly-2', { createdAt: '2026-03-01T00:00:00Z' }, weekly),
            createTournament('weekly-1', { createdAt: '2026-01-02T00:00:00Z', startedAt: '2026-01-08T00:00:00Z', endedAt: '2026-01-08T02:00:00Z' }, weekly),
            createTournament('alone', { createdAt: '2026-04-01T00:00:00Z', startedAt: '2026-04-05T00:00:00Z' }),
        ], [weekly, empty]);

        assert.deepStrictEqual(urls.map(url => [url.path, url.lastmod?.toISOString()]), [
            ['/tournament-series/weekly', '2026-03-01T00:00:00.000Z'],
            ['/tournament-series/empty%20series', '2026-02-01T00:00:00.000Z'],
            ['/tournaments/weekly-2', '2026-03-01T00:00:00.000Z'],
            ['/tournaments/weekly-1', '2026-01-08T02:00:00.000Z'],
            ['/tournaments/alone', '2026-04-05T00:00:00.000Z'],
        ]);
    });
});
