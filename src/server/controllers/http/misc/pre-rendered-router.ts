import { Router } from 'express';
import { Container } from 'typedi';
import { PreRenderedService } from '../../../services/PreRenderedService.js';

/**
 * Serve some pre-rendered pages to make them
 * well indexed in search engines.
 */
export function preRenderedRouter(): Router {
    const preRenderedService = Container.get(PreRenderedService);
    const manifest = preRenderedService.readPreRenderedPagesManifest();
    const router = Router();

    for (const preRenderedPage of manifest) {
        router.get(preRenderedPage.path, async (_, res) => {
            res.send(await preRenderedService.renderTemplate(preRenderedPage));
        });
    }

    preRenderedService.preloadTemplatesInMemory(manifest);

    return router;
}
