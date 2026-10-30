import type { SocialMeta, SocialMetaContext } from '../SocialMeta.js';

/**
 * Builds translated social meta of a page, from what this page displays.
 */
export interface SocialMetaBuilderInterface<T>
{
    /**
     * Returns meta to override default ones,
     * or null when there is no specific meta for this page.
     */
    buildMeta(data: T, context: SocialMetaContext): null | Partial<SocialMeta>;
}
