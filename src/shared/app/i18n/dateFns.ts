import { Locale } from 'date-fns';
import { availableLocales } from './availableLocales.js';

export const loadDateFnsLocale = async (locale: string): Promise<undefined | Locale> => {
    if (availableLocales[locale]) {
        return (await availableLocales[locale].loader()).default;
    }

    locale = locale.split('-')[0]; // If not "en-US", try loading "en" file

    if (availableLocales[locale]) {
        return (await availableLocales[locale].loader()).default;
    }

    // eslint-disable-next-line no-console
    console.warn(`No locale "${locale}" for date-fns`);

    return (await availableLocales['en'].loader()).default;
};
