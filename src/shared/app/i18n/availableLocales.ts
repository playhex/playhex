import { Locale } from 'date-fns';

type DefaultExportLocale = Promise<{ default: Locale }>;

type AvailableLocales = {
    [locale: string]: {
        label: string;
        loader: () => DefaultExportLocale;
    };
};

export const availableLocales: AvailableLocales = {
    de: {
        label: 'German (47%)',
        loader: () => import(/* webpackChunkName: "locale-de" */ 'date-fns/locale/de') as unknown as DefaultExportLocale,
    },
    en: {
        label: 'English',
        loader: () => import(/* webpackChunkName: "locale-en" */ 'date-fns/locale/en-US') as unknown as DefaultExportLocale,
    },
    fr: {
        label: 'Français',
        loader: () => import(/* webpackChunkName: "locale-fr" */ 'date-fns/locale/fr') as unknown as DefaultExportLocale,
    },
    'zh-Hans': {
        label: 'Chinese (beta)',
        loader: () => import(/* webpackChunkName: "locale-zh" */ 'date-fns/locale/zh-CN') as unknown as DefaultExportLocale,
    },
    pl: {
        label: 'Polish (beta)',
        loader: () => import(/* webpackChunkName: "locale-pl" */ 'date-fns/locale/pl') as unknown as DefaultExportLocale,
    },
    pt: {
        label: 'Portuguese (beta)',
        loader: () => import(/* webpackChunkName: "locale-pt" */ 'date-fns/locale/pt') as unknown as DefaultExportLocale,
    },
};
