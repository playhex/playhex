export const SHORT_LINK_PATH_PREFIX = '/s/';

export const isValidShortLinkSlug = (slug: string): boolean => /^[a-z0-9_-]{1,32}$/.test(slug);

/**
 * Must be relative to the app ("/puzzles/xxx"), not "//domain" nor "https://...".
 */
export const isValidShortLinkTarget = (target: string): boolean =>
    target.length <= 512
    && target.startsWith('/')
    && !target.startsWith('//')
    && !target.startsWith('/\\')
    && !target.startsWith(SHORT_LINK_PATH_PREFIX)
    && !/\s/.test(target)
;

export const generateShortLinkSlug = (length = 4): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let slug = '';

    for (let i = 0; i < length; ++i) {
        slug += chars[Math.floor(Math.random() * chars.length)];
    }

    return slug;
};
