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
};
