import 'express-async-errors';
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { HttpError as RoutingControllersHttpError } from 'routing-controllers';
import { registerApi } from './api';
import { staticsRouter } from './misc/statics-router';
import { pagesRouter } from './misc/pages-router';
import { seoRouter } from './misc/seo-router';
import { pwaRouter } from './misc/pwa-router';
import HttpError from './HttpError';
import logger from '../../services/logger';
import HandledError from '../../../shared/app/Errors';

export const registerHttpControllers = (app: Express): void => {
    app.use(express.static(path.join(process.cwd(), 'assets')));
    registerApi(app);
    app.use(staticsRouter());
    app.use(pwaRouter());
    app.use(seoRouter());
    app.use(pagesRouter());

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.notice('API error: ' + err.message, { classname: err.constructor.name, errorMessage: err.message, err, stack: err.stack });

        if (err instanceof HandledError) {
            const httpError = HttpError.fromHandledError(err);
            res.status(httpError.status).send(httpError.normalize()).end();
            return;
        }

        if (err instanceof HttpError) {
            res.status(err.status).send(err.normalize()).end();
            return;
        }

        if (err instanceof RoutingControllersHttpError) {
            const httpError = new HttpError(
                err.httpCode,
                `${err.name}: ${err.message}`,
                undefined,
                // Add validation errors if any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (err as any).errors ?? undefined,
            );

            res.status(err.httpCode).send(httpError.normalize()).end();
            return;
        }

        logger.error('Unhandled API error', { errorMessage: err.message, err });

        const httpError = new HttpError(500, 'Server error');
        res.status(httpError.status).send(httpError.normalize()).end();

        next(err);
    });
};
