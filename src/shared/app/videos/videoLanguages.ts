import { availableLocales } from '../i18n/availableLocales.js';

/**
 * Languages a video can be tagged with: same as PlayHex translations,
 * to reuse their flags.
 */
export const videoLanguages = Object.keys(availableLocales);

export const isVideoLanguage = (language: string): boolean => language in availableLocales;

/**
 * Utf8 flag of a language, taken from availableLocales label,
 * which starts with a flag (two regional indicator symbols).
 */
export const videoLanguageFlag = (language: string): string => {
    const label = availableLocales[language]?.label;

    if (!label) {
        return language;
    }

    return [...label].slice(0, 2).join('');
};

/**
 * Maps a language tag from another source (e.g "en-US", "zh") to a video language,
 * or null if not supported.
 */
export const toVideoLanguage = (languageTag: null | undefined | string): null | string => {
    if (!languageTag) {
        return null;
    }

    if (isVideoLanguage(languageTag)) {
        return languageTag;
    }

    const prefix = languageTag.split('-')[0].toLowerCase();

    return videoLanguages.find(language => language.split('-')[0] === prefix) ?? null;
};
