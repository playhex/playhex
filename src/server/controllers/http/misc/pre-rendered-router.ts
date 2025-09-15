import { Router } from 'express';
import { Container } from 'typedi';
import { PreRenderedService } from '../../../services/PreRenderedService.js';
import logger from '../../../services/logger.js';

/**
 * Serve some pre-rendered pages to make them
 * well indexed in search engines.
 */
export function preRenderedRouter(): Router {
    const preRenderedService = Container.get(PreRenderedService);
    const router = Router();

    router.get('/{*path}', async (req, res, next) => {
        const { path } = req;

        if (!await preRenderedService.canHandlePath(path)) {
            next();
            return;
        }

        try {
            res.send(await preRenderedService.renderTemplate(path));
        } catch {
            // In case of error, continue to next routers.
            // Maybe pre-rendered page template has been removed, try refreshing pre-rendered pages cache.
            logger.warning('Error while rendering pre-rendered page, continue to next routers', {
                path,
            });

            next();
        }
    });

    void preRenderedService.preloadTemplatesInMemory();

    return router;
}
