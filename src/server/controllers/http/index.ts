import 'express-async-errors';
import express, { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import apiRouter from './api';
import { staticsRouter } from './misc/statics-router';
import { pagesRouter } from './misc/pages-router';
import { seoRouter } from './misc/seo-router';
import { pwaRouter } from './misc/pwa-router';
import HttpError from './HttpError';
import logger from '../../services/logger';
import HandledError from '../../../shared/app/Errors';

export default () => {
    const router = Router();

    router.use(express.static(path.join(process.cwd(), 'assets')));
    router.use(apiRouter());
    router.use(staticsRouter());
    router.use(pwaRouter());
    router.use(seoRouter());
    router.use(pagesRouter());

    router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof HandledError) {
            const httpError = HttpError.fromHandledError(err);
            res.status(httpError.status).send(httpError.normalize()).end();
            return;
        }

        if (err instanceof HttpError) {
            res.status(err.status).send(err.normalize()).end();
            return;
        }

        logger.error('Unhandled API error', { errorMessage: err.message, err });

        const httpError = new HttpError(500, 'Server error');
        res.status(httpError.status).send(httpError.normalize()).end();

        next(err);
    });

    return router;
};
