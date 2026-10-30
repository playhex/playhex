import { Service } from 'typedi';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import type { SocialMetaBuilderInterface } from './SocialMetaBuilderInterface.js';

/**
 * Static pages with dedicated title and description,
 * translations in "social_preview.static.<key>".
 */
const staticPages: { [path: string]: string } = {
    '/puzzles': 'puzzles',
    '/tournaments': 'tournaments',
    '/tournament-series': 'tournament_series',
    '/king-of-the-hill': 'ladders',
    '/games-archive': 'games_archive',
    '/videos': 'videos',
    '/statistics': 'statistics',
    '/hexplorer': 'hexplorer',
    '/swap-maps': 'swap_maps',
    '/guide': 'guide',
};

/**
 * Builds meta from page path.
 */
@Service()
export default class StaticPageMetaBuilder implements SocialMetaBuilderInterface<string>
{
    buildMeta(path: string, context: SocialMetaContext): null | Partial<SocialMeta>
    {
        const key = staticPages[path.replace(/\/+$/, '') || '/'];

        if (undefined === key) {
            return null;
        }

        return {
            title: withSiteName(context.t(`social_preview.static.${key}.title`)),
            description: context.t(`social_preview.static.${key}.description`),
        };
    }
}
