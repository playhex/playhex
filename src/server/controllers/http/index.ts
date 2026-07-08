import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { registerApi } from './api/index.js';
import { staticsRouter } from './misc/statics-router.js';
import { pagesRouter } from './misc/pages-router.js';
import { reflectMetadataRouter } from './misc/reflect-metadata-router.js';
import { seoRouter } from './misc/seo-router.js';
import { pwaRouter } from './misc/pwa-router.js';
import logger from '../../services/logger.js';
import { DomainHttpError, normalizeDomainHttpError } from '../../../shared/app/DomainHttpError.js';
import { HttpError } from 'routing-controllers';
import { preRenderedRouter } from './misc/pre-rendered-router.js';
import { avatarsPath } from '../../services/PlayerAvatarService.js';
import { ipBanMiddleware } from '../../services/security/ipBanMiddleware.js';
import { errorToRateLimitReachedErrorPayload, RateLimitReachedError } from '../../services/rate-limiters.js';
import { TranslatableHttpError } from '../../../shared/app/TranslatableHttpError.js';

export const registerHttpControllers = async (app: Express, httpServer: http.Server): Promise<void> => {
    app.use(ipBanMiddleware);
    app.use(preRenderedRouter());
    app.use(express.static(path.join(process.cwd(), 'assets'), { dotfiles: 'allow' }));
    app.use(reflectMetadataRouter());
    app.use('/avatars', express.static(avatarsPath));
    // Bootstrap CSS (LTR + RTL builds) served as plain files, referenced directly in the page <head>.
    app.use('/statics/bootstrap-css', express.static(path.join(process.cwd(), 'node_modules', 'bootstrap', 'dist', 'css')));
    registerApi(app);
    app.use(await staticsRouter(httpServer));
    app.use(pwaRouter());
    app.use(seoRouter());
    app.use(pagesRouter());

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.notice(`API error: ${req.method} ${req.route?.path ?? req.originalUrl}`, {
            classname: err.constructor.name,
            errorMessage: err.message,
            stack: err.stack,
            err,
        });

        if (err instanceof DomainHttpError) {
            res
                .status(err.httpCode)
                .send(normalizeDomainHttpError(err))
                .end()
            ;

            return;
        }

        if (err instanceof TranslatableHttpError) {
            res
                .status(err.httpStatus)
                .send(err.toPayload())
                .end()
            ;

            return;
        }

        if (err instanceof RateLimitReachedError) {
            res
                .status(429)
                .send(errorToRateLimitReachedErrorPayload(err))
                .end()
            ;

            return;
        }

        if (err instanceof HttpError) {
            res
                .status(err.httpCode)
                .send(err)
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
