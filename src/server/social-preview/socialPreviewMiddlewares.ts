import type { Request, Response, NextFunction } from 'express';
import logger from '../services/logger.js';
import { createDefaultSocialMeta, type SocialMeta, type SocialMetaContext } from './SocialMeta.js';
import { isSocialBot } from './isSocialBot.js';
import { resolveSocialLocale } from './resolveSocialLocale.js';
import { getSocialT } from './socialI18n.js';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Locals {
            /**
             * Set only when page is requested by a crawler.
             */
            socialMeta?: SocialMeta;
            socialMetaContext?: SocialMetaContext;
        }
    }
}

/**
 * Crawlers don't wait, but avoid keeping requests forever if database is slow.
 */
export const RESOLVE_TIMEOUT_MS = 2000;

export type MetaResolver = (req: Request, context: SocialMetaContext) => Promise<null | Partial<SocialMeta>>;

export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);

    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
});

/**
 * Completes page social meta with resolved ones.
 * Never fails: on missing entity, error or timeout, default meta are kept,
 * so the page is always rendered.
 */
export const resolveMeta = (resolver: MetaResolver, timeoutMs = RESOLVE_TIMEOUT_MS) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { socialMeta, socialMetaContext } = res.locals;

    if (!socialMeta || !socialMetaContext) {
        next();
        return;
    }

    try {
        const meta = await withTimeout(resolver(req, socialMetaContext), timeoutMs);

        if (meta === null) {
            // Not found: let the client show its "not found" page, but don't index it
            socialMeta.noindex = true;
        } else {
            Object.assign(socialMeta, meta, {
                jsonLd: [...socialMeta.jsonLd, ...(meta.jsonLd ?? [])],
            });
        }
    } catch (e) {
        logger.notice('Could not resolve social preview meta, keep default ones', {
            url: req.originalUrl,
            errorMessage: e instanceof Error ? e.message : String(e),
        });
    }

    next();
};

export const pageUrl = (req: Request, baseUrl: string): string => {
    const url = new URL(req.path, baseUrl);
    const { lang } = req.query;

    // Keep lang in url so that crawlers cache each language preview separately
    if (typeof lang === 'string' && lang) {
        url.searchParams.set('lang', lang);
    }

    return url.toString();
};

/**
 * Only for crawlers: initializes default social meta of the page.
 * Real visitors skip the whole router, so they never wait for database queries.
 */
export const initSocialMeta = (baseUrl: string) => (req: Request, res: Response, next: NextFunction): void => {
    // Same url renders different meta for crawlers and visitors
    res.vary('User-Agent');

    if (!isSocialBot(req.get('User-Agent'), req.query)) {
        next('router');
        return;
    }

    const locale = resolveSocialLocale(req);

    res.locals.socialMetaContext = {
        t: getSocialT(locale),
        locale,
        baseUrl,
        url: pageUrl(req, baseUrl),
    };

    res.locals.socialMeta = createDefaultSocialMeta(res.locals.socialMetaContext);

    next();
};
