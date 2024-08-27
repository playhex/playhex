import { Locale } from 'date-fns';

type DefaultExportLocale = Promise<{ default: Locale }>;

export type Translator = {
    fullName: string;
    link?: `http${string}`;
};

type AvailableLocales = {
    [locale: string]: {
        label: string;
        loader: () => DefaultExportLocale;
        translators?: Translator[];
    };
};

/**
 * Should be sorted by label, except "English" should be first, just because source language and most used.
 *
 * - Locale key must have same name a translation file
 *
 * - Label is displayed to player in select menu.
 *      Should use form "<native name> (<english name>)".
 *      Native names are listed i.e here: https://matomo.org/translations/
 *      "(beta)" is added when translated with AI, and not yet verified by community.
 *
 * - Loader is file used for date-fns, to translate date/times
 *
 * - Translators are people who contributed through Weblate or directly on Github.
 *      They are added manually, but those from Weblate can be listed with:
 *      https://hosted.weblate.org/projects/playhex/#reports (left menu, JSON, since beginning).
 */
export const availableLocales: AvailableLocales = {
    en: {
        label: 'English',
        loader: () => import(/* webpackChunkName: "locale-en" */ 'date-fns/locale/en-US') as unknown as DefaultExportLocale,
    },
    de: {
        label: 'Deutsch (German)',
        loader: () => import(/* webpackChunkName: "locale-de" */ 'date-fns/locale/de') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'Ettore Atalan', link: 'https://hosted.weblate.org/user/Atalanttore/' },
            { fullName: 'Peter Selinger', link: 'https://playhex.org/@quasar' },
        ],
    },
    es: {
        label: 'Español (Spanish)',
        loader: () => import(/* webpackChunkName: "locale-es" */ 'date-fns/locale/es') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'gallegonovato', link: 'https://hosted.weblate.org/user/gallegonovato/' },
            { fullName: 'Guille', link: 'https://hosted.weblate.org/user/guillevg/' },
        ],
    },
    fr: {
        label: 'Français (French)',
        loader: () => import(/* webpackChunkName: "locale-fr" */ 'date-fns/locale/fr') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'Julien Maulny', link: 'https://playhex.org/@alcalyn' },
        ],
    },
    pl: {
        label: 'Polski (Polish)',
        loader: () => import(/* webpackChunkName: "locale-pl" */ 'date-fns/locale/pl') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'FlyPside', link: 'https://playhex.org/@flypside' },
        ],
    },
    pt: {
        label: 'Português (Portuguese) (beta)',
        loader: () => import(/* webpackChunkName: "locale-pt" */ 'date-fns/locale/pt') as unknown as DefaultExportLocale,
    },
    'zh-Hans': {
        label: '简体中文 (Chinese) (beta)',
        loader: () => import(/* webpackChunkName: "locale-zh" */ 'date-fns/locale/zh-CN') as unknown as DefaultExportLocale,
    },
};
