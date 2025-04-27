import 'express-async-errors';
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { registerApi } from './api/index.js';
import { staticsRouter } from './misc/statics-router.js';
import { pagesRouter } from './misc/pages-router.js';
import { seoRouter } from './misc/seo-router.js';
import { pwaRouter } from './misc/pwa-router.js';
import logger from '../../services/logger.js';
import { DomainHttpError, normalizeDomainHttpError } from '../../../shared/app/DomainHttpError.js';
import { HttpError } from 'routing-controllers';

export const registerHttpControllers = (app: Express): void => {
    app.use(express.static(path.join(process.cwd(), 'assets')));
    registerApi(app);
    app.use(staticsRouter());
    app.use(pwaRouter());
    app.use(seoRouter());
    app.use(pagesRouter());

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.notice('API error: ' + req.originalUrl + ' ' + err.message, { classname: err.constructor.name, errorMessage: err.message, err, stack: err.stack });

        if (err instanceof DomainHttpError) {
            res
                .status(err.httpCode)
                .send(normalizeDomainHttpError(err))
                .end()
            ;

            return;
        }

        if (err instanceof HttpError) {
            res
                .status(err.httpCode)
                .send({
                    error: err.message,
                })
                .end()
            ;

            return;
        }

        logger.error('Unhandled API error', { errorMessage: err.message, err, errorClass: err.constructor.name });

        res
            .status(500)
            .send('Server error')
            .end()
        ;

        next(err);
    });
};
