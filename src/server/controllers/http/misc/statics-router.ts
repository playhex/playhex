import path from 'path';
import express from 'express';
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { IS_DEV, WEBPACK_PORT } from '../../../config.js';

export function staticsRouter(): Router {
    const router = Router();

    if (IS_DEV) {
        // All the assets are hosted by Webpack on localhost:${config.WEBPACK_PORT} (Webpack-dev-server)
        router.use(
            '/statics',
            createProxyMiddleware({
                target: `http://localhost:${WEBPACK_PORT}/statics`,
            }),
        );
    } else {
        const staticsPath = path.join(process.cwd(), 'dist', 'statics');

        // All the assets are in "statics" folder (Done by Webpack during the build phase)
        router.use('/statics', express.static(staticsPath));
    }
    return router;
}
