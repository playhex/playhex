import { isbot } from 'isbot';

/**
 * Forces social preview rendering when present (e.g "?social_preview"), to debug with a browser
 * or curl without a crawler user agent.
 */
export const FORCE_SOCIAL_PREVIEW_PARAMETER = 'social_preview';

/**
 * Whether page should be rendered with social preview meta.
 * Only crawlers (Discord, WhatsApp, Facebook, Googlebot...) get them,
 * so real visitors don't wait for database queries on first page load.
 */
export const isSocialBot = (userAgent: undefined | string, query: { [key: string]: unknown }): boolean => {
    if (query[FORCE_SOCIAL_PREVIEW_PARAMETER] !== undefined) {
        return true;
    }

    return isbot(userAgent);
};
