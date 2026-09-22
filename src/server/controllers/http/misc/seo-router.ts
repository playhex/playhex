import { Router } from 'express';

/**
 * Static pages worth indexing in search engines.
 */
const sitemapUrls: string[] = [
    '/',
    '/landing',
    '/cs/landing',
    '/de/landing',
    '/en/landing',
    '/fr/landing',
    '/ja/landing',
    '/ko/landing',
    '/pl/landing',
    '/tr/landing',
    '/zh/landing',
    '/guide',
    '/guide/ai-analysis',
    '/guide/conditional-moves',
    '/guide/moderation',
    '/games-archive',
    '/export-games-data',
];

export function seoRouter(): Router {
    const router = Router();
    const baseUrl = process.env.BASE_URL;

    router.get('/robots.txt', (_, res) => {
        res.header('Content-Type', 'text/plain');
        res.render('seo/robots.txt.ejs', {
            baseUrl,
        });
    });

    router.get('/sitemap.xml', (_, res) => {
        res.header('Content-Type', 'application/xml');
        res.render('seo/sitemap.xml.ejs', {
            baseUrl,
            urls: sitemapUrls,
        });
    });

    return router;
}
