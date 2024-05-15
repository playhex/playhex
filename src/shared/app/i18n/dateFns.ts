import { Locale } from 'date-fns';

type DefaultExportLocale = Promise<{ default: Locale }>;

const localeLoaders: { [locale: string]: () => DefaultExportLocale } = {
    en: () => import(/* webpackChunkName: "locale-en" */ 'date-fns/locale/en-US') as DefaultExportLocale,
    fr: () => import(/* webpackChunkName: "locale-fr" */ 'date-fns/locale/fr') as DefaultExportLocale,
};

export const loadDateFnsLocale = async (locale: string): Promise<undefined | Locale> => {
    if (localeLoaders[locale]) {
        return (await localeLoaders[locale]()).default;
    }

    const primaryLang = locale.split('-')[0];

    if (localeLoaders[primaryLang]) {
        return (await localeLoaders[primaryLang]()).default;
    }

    // eslint-disable-next-line no-console
    console.warn(`No locale "${locale}" for date-fns`);

    return;
};
