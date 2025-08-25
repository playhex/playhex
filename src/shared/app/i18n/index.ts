import { setDefaultOptions as setDateFnsDefaultOptions } from 'date-fns';
import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { loadDateFnsLocale } from './dateFns.js';
import { availableLocales } from './availableLocales.js';

export {
    availableLocales,
};

const localStorageKey = 'selectedLocale';

const getPlayerSelectedLocale = (): null | string => localStorage?.getItem(localStorageKey);

/**
 * Get list of player used locales from its browser, and available in translations.
 * Used to display in quick locales switcher.
 */
export const getQuickLocales = (): string[] => {
    const availableLocalesCodes = Object.keys(availableLocales);
    const locales: string[] = [];

    for (const navigatorLocale of navigator.languages) {
        if (availableLocalesCodes.includes(navigatorLocale)) {
            locales.push(navigatorLocale);
        }
    }

    if (!locales.includes('en')) {
        // Always show english, at least at last choice, because source locale, always available.
        locales.push('en');
    }

    return locales;
};

/**
 * @returns Locale used by player but translation not exists yet
 */
export const getPlayerMissingLocale = (): null | string => {
    const availableLocalesCodes = Object.keys(availableLocales);

    for (const navigatorLocale of navigator.languages) {
        // Exclude sub locales like "fr-FR", "en-US", keep only "fr", "en"
        if (navigatorLocale.match(/(-|_)/)) {
            continue;
        }

        // Locale already exists
        if (availableLocalesCodes.includes(navigatorLocale)) {
            continue;
        }

        return navigatorLocale;
    }

    return null;
};

const getSupportedBrowserLocale = (): null | string => {
    const availableLocalesCodes = Object.keys(availableLocales);

    for (const navigatorLocale of navigator.languages) {
        if (availableLocalesCodes.includes(navigatorLocale)) {
            return navigatorLocale;
        }
    }

    return null;
};

/**
 * Get locale that should be used.
 * Either player selected it, or prefered by browser.
 */
export const autoLocale = (): string => getPlayerSelectedLocale() ?? getSupportedBrowserLocale() ?? 'en';

const setI18nLanguage = (locale: string) => {
    i18n.changeLanguage(locale);
    document.querySelector('html')!.setAttribute('lang', locale);
};

const loadLocaleMessages = async (locale: string) => {
    const messages = await import(
        /* webpackChunkName: "locale-[request]" */ `./locales/${locale}.json`
    );

    // set locale and locale message
    i18n.addResourceBundle(locale, 'translation', messages.default);
};

/**
 * Switch app locale.
 *
 * @param locale "en", "fr", "en-US", ...
 * @param remember Default true, remember this choice. Should be true when locale is explicitely selected by user,
 *                 or false if locale still should be detected from browser.
 */
export const setLocale = async (locale: string, remember = true) => {
    if (remember) {
        localStorage?.setItem(localStorageKey, locale);
    }

    setDateFnsDefaultOptions({ locale: await loadDateFnsLocale(locale) });
    await loadLocaleMessages(locale);
    setI18nLanguage(locale); // Should be last so when "languageChanged" is emitted, date fns also has the new locale
};

(async () => {
    // Load current locale translation as soon as possible to prevent text blinking
    loadLocaleMessages(autoLocale());

    // Always load en locales for fallbacks (in case of missing translation)
    loadLocaleMessages('en');

    await i18n
        .use(HttpBackend)
        .init({
            lng: autoLocale(),
            debug: process.env.NODE_ENV === 'development',
            fallbackLng: 'en',
            interpolation: { escapeValue: false },
        })
    ;

    setLocale(autoLocale(), false);
})();
