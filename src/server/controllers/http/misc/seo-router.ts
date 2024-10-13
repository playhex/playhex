import { Router } from 'express';

export function seoRouter(): Router {
    const router = Router();
    const baseUrl = process.env.BASE_URL;

    router.get('/robots.txt', async (_, res) => {
        res.header('Content-Type', 'text/plain');
        res.render('seo/robots.txt.ejs', {
            baseUrl,
        });
    });

    router.get('/sitemap.xml', async (_, res) => {
        res.header('Content-Type', 'application/xml');
        res.render('seo/sitemap.xml.ejs', {
            baseUrl,
        });
    });

    return router;
}
