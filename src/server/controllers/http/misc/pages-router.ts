import { Router } from 'express';
import { getManifest } from './manifest-manager.js';
import { seo } from '../../../../shared/app/seo.js';

export function pagesRouter(): Router {
    const router = Router();

    // Render main page for any routes for html5 navigation
    router.get('/{*path}', async (_, res) => {
        const manifest = await getManifest();

        res.render('page.ejs', {
            manifest,
            seo,
            baseUrl: process.env.BASE_URL,
            sentryLoaderScript: process.env.SENTRY_LOADER_SCRIPT,
            blockRobotsIndex: process.env.BLOCK_ROBOTS_INDEX === 'true',
        });
    });

    return router;
}
