import fs from 'node:fs';
import path from 'node:path';
import i18next, { type i18n, type TFunction } from 'i18next';
import { supportedSocialLocales, type SocialLocale } from './SocialMeta.js';

const localesDir = 'src/shared/app/i18n/locales';

let instance: null | i18n = null;

/**
 * Server side i18next instance, separated from client global one,
 * loaded once with translation files of supported social locales.
 */
const getInstance = (): i18n => {
    if (instance !== null) {
        return instance;
    }

    const resources = Object.fromEntries(supportedSocialLocales.map(locale => [
        locale,
        { translation: JSON.parse(fs.readFileSync(path.join(localesDir, `${locale}.json`), 'utf-8')) },
    ]));

    instance = i18next.createInstance();

    void instance.init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        initAsync: false,
        interpolation: {
            // Values are escaped when rendered in ejs templates
            escapeValue: false,
        },
    });

    return instance;
};

export const getSocialT = (locale: SocialLocale): TFunction => getInstance().getFixedT(locale);
