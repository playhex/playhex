import { setDefaultOptions } from 'date-fns';
import { nextTick } from 'vue';
import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { loadDateFnsLocale } from './dateFns';

export const availableLocales = {
    en: 'English',
    fr: 'Français',
};

const localStorageKey = 'selectedLocale';

const getPlayerSelectedLocale = (): null | string => localStorage?.getItem(localStorageKey);

const getSupportedBrowserLocale = (): null | string => {
    const availableLocalesCodes = Object.keys(availableLocales);

    for (const navigatorLocale of navigator.languages) {
        if (availableLocalesCodes.includes(navigatorLocale)) {
            return navigatorLocale;
        }
    }

    return 'en';
};

/**
 * Get locale that should be used.
 * Either player selected it, or prefered by browser.
 */
const autoLocale = (): string => getPlayerSelectedLocale() ?? getSupportedBrowserLocale() ?? 'en';

const setI18nLanguage = (locale: string) => {
    i18next.changeLanguage(locale);
    document.querySelector('html')!.setAttribute('lang', locale);
};

const loadLocaleMessages = async (locale: string) => {
    const messages = await import(
      /* webpackChunkName: "locale-[request]" */ `./locales/${locale}.json`
    );

    // set locale and locale message
    i18next.addResourceBundle(locale, 'translation', messages.default);

    return nextTick();
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

    await loadLocaleMessages(locale);
    setI18nLanguage(locale);
    setDefaultOptions({ locale: await loadDateFnsLocale(locale) });
};

i18next
    .use(HttpBackend)
    .init({
        debug: true,
        fallbackLng: 'en',
    })
;

// Always load en locales for fallbacks (in case of missing translation)
loadLocaleMessages('en');

setLocale(autoLocale(), false);
