import express, { Router } from 'express';
import path from 'path';
import apiRouter from './api';
import { staticsRouter } from './misc/statics-router';
import { pagesRouter } from './misc/pages-router';
import { seoRouter } from './misc/seo-router';
import { pwaRouter } from './misc/pwa-router';

export default function () {
    const router = Router();

    router.use(express.static(path.join(process.cwd(), 'assets')));
    router.use(apiRouter());
    router.use(staticsRouter());
    router.use(pwaRouter());
    router.use(seoRouter());
    router.use(pagesRouter());

    return router;
}
