import { isSupportedSocialLocale, supportedSocialLocales, type SocialLocale } from './SocialMeta.js';

/**
 * What is read from the request, so it can be tested without express.
 */
export type SocialLocaleRequest = {
    query: { [key: string]: unknown };
    get: (header: string) => undefined | string;
    acceptsLanguages: (...languages: string[]) => false | string;
};

/**
 * "fr_FR", "fr-FR", "FR" => "fr"
 */
const toSupportedLocale = (value: unknown): null | SocialLocale => {
    if (typeof value !== 'string') {
        return null;
    }

    const language = value.split(/[-_]/)[0].toLowerCase();

    return isSupportedSocialLocale(language) ? language : null;
};

/**
 * Crawlers don't run javascript and mostly don't send their user language,
 * so locale is guessed from what is available, by order of reliability:
 *
 * 1. "?lang=fr" in url: added by share buttons of the app, works for every crawler.
 * 2. Facebook: "fb_locale=fr_FR" query parameter or "X-Facebook-Locale" header.
 * 3. Accept-Language header. WhatsApp sends the sender language.
 * 4. Default to english.
 */
export const resolveSocialLocale = (req: SocialLocaleRequest): SocialLocale => {
    return toSupportedLocale(req.query.lang)
        ?? toSupportedLocale(req.query.fb_locale)
        ?? toSupportedLocale(req.get('X-Facebook-Locale'))
        ?? toSupportedLocale(req.get('Accept-Language') ? req.acceptsLanguages(...supportedSocialLocales) : undefined)
        ?? 'en'
    ;
};
