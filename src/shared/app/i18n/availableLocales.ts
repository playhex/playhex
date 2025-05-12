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
 * Should be sorted by label.
 *
 * - Locale key must have same name a translation file
 *
 * - Label is displayed to player in select menu.
 *      Should use form "<utf8 flag> <native name> (<english name>) (beta?)".
 *      Native names are listed i.e here: https://matomo.org/translations/
 *      "(beta)" is added when translated with AI, and not yet verified by community.
 *      Flags can be copied from i.e here: https://emojipedia.org/search?q=poland
 *
 * - Loader is file used for date-fns, to translate date/times
 *
 * - Translators are people who contributed through Weblate or directly on Github.
 *      They are added manually, but those from Weblate can be listed with:
 *      https://hosted.weblate.org/projects/playhex/#reports (left menu, JSON, since beginning).
 */
export const availableLocales: AvailableLocales = {
    da: {
        label: '🇩🇰 Dansk (Danish)',
        loader: () => import(/* webpackChunkName: "locale-da" */ 'date-fns/locale/da') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'Kristoffer Marboe', link: 'https://github.com/KrisMarboe' },
        ],
    },
    de: {
        label: '🇩🇪 Deutsch (German)',
        loader: () => import(/* webpackChunkName: "locale-de" */ 'date-fns/locale/de') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'Ettore Atalan', link: 'https://hosted.weblate.org/user/Atalanttore/' },
            { fullName: 'Peter Selinger', link: 'https://playhex.org/@quasar' },
        ],
    },
    en: {
        label: '🇺🇸 English',
        loader: () => import(/* webpackChunkName: "locale-en" */ 'date-fns/locale/en-US') as unknown as DefaultExportLocale,
    },
    es: {
        label: '🇪🇸 Español (Spanish)',
        loader: () => import(/* webpackChunkName: "locale-es" */ 'date-fns/locale/es') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'gallegonovato', link: 'https://hosted.weblate.org/user/gallegonovato/' },
            { fullName: 'Guille', link: 'https://hosted.weblate.org/user/guillevg/' },
            { fullName: '2swap', link: 'http://localhost:3000/@2swap' },
            { fullName: 'Marco', link: 'https://hosted.weblate.org/user/60825138Mmm./' },
        ],
    },
    fr: {
        label: '🇫🇷 Français (French)',
        loader: () => import(/* webpackChunkName: "locale-fr" */ 'date-fns/locale/fr') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'Julien Maulny', link: 'https://playhex.org/@alcalyn' },
        ],
    },
    id: {
        label: '🇮🇩 Indonesia (Indonesian)',
        loader: () => import(/* webpackChunkName: "locale-id" */ 'date-fns/locale/id') as unknown as DefaultExportLocale,
        translators: [
            { fullName: '2swap', link: 'http://localhost:3000/@2swap' },
        ],
    },
    it: {
        label: '🇮🇹 Italiano (Italian) (beta)',
        loader: () => import(/* webpackChunkName: "locale-it" */ 'date-fns/locale/it') as unknown as DefaultExportLocale,
    },
    ko: {
        label: '🇰🇷 한국어 (Korean) (beta)',
        loader: () => import(/* webpackChunkName: "locale-ko" */ 'date-fns/locale/ko') as unknown as DefaultExportLocale,
    },
    nl: {
        label: '🇳🇱 Nederlands (Dutch) (beta)',
        loader: () => import(/* webpackChunkName: "locale-nl" */ 'date-fns/locale/nl') as unknown as DefaultExportLocale,
    },
    pl: {
        label: '🇵🇱 Polski (Polish)',
        loader: () => import(/* webpackChunkName: "locale-pl" */ 'date-fns/locale/pl') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'FlyPside', link: 'https://playhex.org/@flypside' },
            { fullName: 'Eryk Michalak', link: 'https://hosted.weblate.org/user/gnu-ewm/' },
            { fullName: 'BlackHat', link: 'https://playhex.org/@blackhat' },
        ],
    },
    pt: {
        label: '🇵🇹 Português (Portuguese) (beta)',
        loader: () => import(/* webpackChunkName: "locale-pt" */ 'date-fns/locale/pt') as unknown as DefaultExportLocale,
    },
    ru: {
        label: '🇷🇺 Русский (Russian)',
        loader: () => import(/* webpackChunkName: "locale-ru" */ 'date-fns/locale/ru') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'Maksim Кабанов', link: 'https://hosted.weblate.org/user/law820314/' },
        ],
    },
    sv: {
        label: '🇸🇪 Svenska (Swedish) (beta)',
        loader: () => import(/* webpackChunkName: "locale-sv" */ 'date-fns/locale/sv') as unknown as DefaultExportLocale,
    },
    ja: {
        label: '🇯🇵 日本語 (Japanese)',
        loader: () => import(/* webpackChunkName: "locale-ja" */ 'date-fns/locale/ja') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'Enpitu Mr', link: 'https://hosted.weblate.org/user/mr.enpitu/' },
        ],
    },
    'zh-Hans': {
        label: '🇨🇳 简体中文 (Chinese) (beta)',
        loader: () => import(/* webpackChunkName: "locale-zh" */ 'date-fns/locale/zh-CN') as unknown as DefaultExportLocale,
    },
    ta: {
        label: '🇮🇳 தமிழ் (Tamil)',
        loader: () => import(/* webpackChunkName: "locale-ta" */ 'date-fns/locale/ta') as unknown as DefaultExportLocale,
        translators: [
            { fullName: 'TamilNeram', link: 'https://hosted.weblate.org/user/TamilNeram/' },
        ],
    },
};
