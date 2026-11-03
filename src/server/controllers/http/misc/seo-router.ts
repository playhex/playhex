import { Router } from 'express';
import { Container } from 'typedi';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import TournamentSeriesRepository from '../../../repositories/TournamentSeriesRepository.js';
import logger from '../../../services/logger.js';
import { staticSitemapUrls, tournamentsSitemapUrls, type SitemapUrl } from '../../../seo/sitemapUrls.js';

const DYNAMIC_SITEMAP_URLS_TTL_MS = 24 * 3600 * 1000;

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
            const [tournaments, seriesList] = await Promise.all([
                Container.get(TournamentRepository).findForSitemap(),
                Container.get(TournamentSeriesRepository).findForSitemap(),
            ]);

            const urls = tournamentsSitemapUrls(tournaments, seriesList);

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
 * Cached in memory, crawlers fetch sitemap often and tournaments don't change that much.
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
