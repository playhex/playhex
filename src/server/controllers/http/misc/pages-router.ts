import { Router } from 'express';
import { getManifest } from './manifest-manager';

export function pagesRouter() {
    const router = Router();

    // Render main page for any routes for html5 navigation
    router.get('/**', async (_, res) => {
        const manifest = await getManifest();
        res.render('page.ejs', {
            manifest,
        });
    });

    return router;
}
