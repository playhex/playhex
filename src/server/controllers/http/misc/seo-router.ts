import { Router } from 'express';
import { PreRenderedService } from '../../../services/PreRenderedService.js';
import { Container } from 'typedi';

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

        const preRenderedService = Container.get(PreRenderedService);

        const urls = await preRenderedService.getAllPreRenderedPaths();

        urls.unshift('/');

        res.render('seo/sitemap.xml.ejs', {
            baseUrl,
            urls,
        });
    });

    return router;
}
