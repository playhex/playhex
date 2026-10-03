import { autoLocale } from '../../../../shared/app/i18n/index.js';

let displayNames: null | Intl.DisplayNames = null;

/**
 * Language name in current player locale, e.g "fr" => "French".
 */
export const videoLanguageName = (language: string): string => {
    displayNames ??= new Intl.DisplayNames([autoLocale()], { type: 'language' });

    return displayNames.of(language) ?? language;
};
