import { Router } from 'express';
import { getManifest, getBootstrapStylesheetUrl } from './manifest-manager.js';
import { seo } from '../../../../shared/app/seo.js';

export function pagesRouter(): Router {
    const router = Router();

    // Render main page for any routes for html5 navigation
    router.get('/{*path}', (_, res) => {
        const manifest = getManifest();

        res.render('page.ejs', {
            manifest,
            bootstrapCssUrl: getBootstrapStylesheetUrl(),
            seo,
            baseUrl: process.env.BASE_URL,
            sentryLoaderScript: process.env.SENTRY_LOADER_SCRIPT,
            blockRobotsIndex: process.env.BLOCK_ROBOTS_INDEX === 'true',
        });
    });

    return router;
}
