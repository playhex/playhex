import i18n from 'i18next';

/**
 * Url to share, with current language,
 * so that social networks show the link preview in sharer language.
 * See resolveSocialLocale() on server.
 */
export const shareUrl = (href: string): string => {
    const url = new URL(href);

    if (i18n.language) {
        url.searchParams.set('lang', i18n.language);
    }

    return url.toString();
};
