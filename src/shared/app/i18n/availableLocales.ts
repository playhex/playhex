import { Locale } from 'date-fns';

type DefaultExportLocale = Promise<{ default: Locale }>;

type AvailableLocales = {
    [locale: string]: {
        label: string;
        loader: () => DefaultExportLocale;
    };
};

/**
 * - Locale key must have same name a translation file
 * - Label is displayed to player in select menu
 * - Loader is file used for date-fns, to translate date/times
 */
export const availableLocales: AvailableLocales = {
    en: {
        label: 'English',
        loader: () => import(/* webpackChunkName: "locale-en" */ 'date-fns/locale/en-US') as unknown as DefaultExportLocale,
    },
    fr: {
        label: 'Français',
        loader: () => import(/* webpackChunkName: "locale-fr" */ 'date-fns/locale/fr') as unknown as DefaultExportLocale,
    },
    de: {
        label: 'German',
        loader: () => import(/* webpackChunkName: "locale-de" */ 'date-fns/locale/de') as unknown as DefaultExportLocale,
    },
    'zh-Hans': {
        label: 'Chinese (beta)',
        loader: () => import(/* webpackChunkName: "locale-zh" */ 'date-fns/locale/zh-CN') as unknown as DefaultExportLocale,
    },
    pl: {
        label: 'Polish',
        loader: () => import(/* webpackChunkName: "locale-pl" */ 'date-fns/locale/pl') as unknown as DefaultExportLocale,
    },
    pt: {
        label: 'Portuguese (beta)',
        loader: () => import(/* webpackChunkName: "locale-pt" */ 'date-fns/locale/pt') as unknown as DefaultExportLocale,
    },
    es: {
        label: 'Spanish',
        loader: () => import(/* webpackChunkName: "locale-es" */ 'date-fns/locale/es') as unknown as DefaultExportLocale,
    },
};
