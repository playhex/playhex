import express, { Router } from 'express';
import path from 'path';
import apiRouter from './api';
import { staticsRouter } from './misc/statics-router';
import { pagesRouter } from './misc/pages-router';

export default function () {
    const router = Router();

    router.use('/assets', express.static(path.join(process.cwd(), 'assets')));
    router.use('/service-worker.js', express.static(path.join(process.cwd(), 'assets', 'service-worker.js')));
    router.use(apiRouter());
    router.use(staticsRouter());
    router.use(pagesRouter());

    return router;
}
