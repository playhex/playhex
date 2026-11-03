import { Router } from 'express';
import { Container } from 'typedi';
import GameRepository from '../../../repositories/GameRepository.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import TournamentSeriesRepository from '../../../repositories/TournamentSeriesRepository.js';
import logger from '../../../services/logger.js';
import { gamesSitemapUrls, staticSitemapUrls, tournamentsSitemapUrls, type SitemapUrl } from '../../../seo/sitemapUrls.js';

const DYNAMIC_SITEMAP_URLS_TTL_MS = 24 * 3600 * 1000;
const SITEMAP_GAMES_LIMIT = 50;
const SITEMAP_GAMES_MIN_RATING = 1600;

let dynamicSitemapUrlsCache: null | { urls: SitemapUrl[], expiresAt: number } = null;

/**
 * Refresh in progress, shared so that concurrent requests don't query database twice.
 */
let dynamicSitemapUrlsRefresh: null | Promise<SitemapUrl[]> = null;

/**
 * Queries database and updates cache.
 * On database error, keeps previous cache, and returns it or no urls,
 * so that sitemap still lists static pages.
 */
const refreshDynamicSitemapUrls = (): Promise<SitemapUrl[]> => {
    dynamicSitemapUrlsRefresh ??= (async () => {
        try {
            const [tournaments, seriesList, games] = await Promise.all([
                Container.get(TournamentRepository).findForSitemap(),
                Container.get(TournamentSeriesRepository).findForSitemap(),
                Container.get(GameRepository).findForSitemap(SITEMAP_GAMES_LIMIT, SITEMAP_GAMES_MIN_RATING),
            ]);

            const urls = [...tournamentsSitemapUrls(tournaments, seriesList), ...gamesSitemapUrls(games)];

            dynamicSitemapUrlsCache = { urls, expiresAt: Date.now() + DYNAMIC_SITEMAP_URLS_TTL_MS };

            return urls;
        } catch (e) {
            logger.error('Could not load sitemap dynamic urls', {
                errorMessage: e instanceof Error ? e.message : String(e),
            });

            return dynamicSitemapUrlsCache?.urls ?? [];
        }
    })().finally(() => {
        dynamicSitemapUrlsRefresh = null;
    });

    return dynamicSitemapUrlsRefresh;
};

/**
 * Cached in memory, crawlers fetch sitemap often and these urls don't need to be fresher.
 * When cache is outdated, returns it right away and refreshes it in background.
 */
const loadDynamicSitemapUrls = async (): Promise<SitemapUrl[]> => {
    if (!dynamicSitemapUrlsCache) {
        return await refreshDynamicSitemapUrls();
    }

    if (dynamicSitemapUrlsCache.expiresAt <= Date.now()) {
        void refreshDynamicSitemapUrls();
    }

    return dynamicSitemapUrlsCache.urls;
};

export function seoRouter(): Router {
    const router = Router();
    const baseUrl = process.env.BASE_URL;

    router.get('/robots.txt', (_, res) => {
        res.header('Content-Type', 'text/plain');
        res.render('seo/robots.txt.ejs', {
            baseUrl,
        });
    });

    router.get('/sitemap.xml', async (_, res) => {
        const urls = [...staticSitemapUrls, ...await loadDynamicSitemapUrls()];

        res.header('Content-Type', 'application/xml');
        res.render('seo/sitemap.xml.ejs', {
            baseUrl,
            urls,
        });
    });

    return router;
}
