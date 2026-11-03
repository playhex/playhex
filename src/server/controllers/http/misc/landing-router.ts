import { Router } from 'express';
import { getBootstrapStylesheetUrl } from './manifest-manager.js';
import { seo } from '../../../../shared/app/seo.js';
import { serializeJsonLd } from '../../../social-preview/serializeJsonLd.js';
import { socialBaseUrl } from '../../../social-preview/SocialMeta.js';
import { defaultLandingLocale, findLandingLocale, landingLocales, landingPath } from '../../../landing/landingLocales.js';
import { buildLandingPage, getLandingBootstrapCssUrl } from '../../../landing/landingPage.js';
import { landingIcons } from '../../../landing/landingIcons.js';

/**
 * Landing page, one url per language, rendered server side for search engines.
 */
export function landingRouter(): Router {
    const router = Router();

    router.get('/landing', (_, res) => {
        res.redirect(301, landingPath(defaultLandingLocale.locale));
    });

    router.get('/:locale/landing', (req, res, next) => {
        const locale = findLandingLocale(req.params.locale);

        if (!locale) {
            next();
            return;
        }

        res.render('page-landing.ejs', {
            page: buildLandingPage(locale, socialBaseUrl()),
            landingLocales,
            seo,
            bootstrapCssUrl: getLandingBootstrapCssUrl(getBootstrapStylesheetUrl(), locale),
            blockRobotsIndex: process.env.BLOCK_ROBOTS_INDEX === 'true',
            serializeJsonLd,
            landingIcons,
            landingPath,
        });
    });

    return router;
}
