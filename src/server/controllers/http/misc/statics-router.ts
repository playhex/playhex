import path from 'path';
import http from 'http';
import { Router } from 'express';
import { IS_DEV } from '../../../config.js';
import { memoryStatic } from './static-memory-cache.js';

export async function staticsRouter(httpServer: http.Server): Promise<Router> {
    const router = Router();

    if (IS_DEV) {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: {
                middlewareMode: true,
                hmr: { server: httpServer, path: '/vite-hmr' },
            },
            appType: 'custom',
        });
        router.use(vite.middlewares);
        return router;
    }

    router.use('/statics', memoryStatic(path.join(process.cwd(), 'dist', 'statics')));

    return router;
}
