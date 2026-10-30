import { createHash } from 'node:crypto';
import { Service } from 'typedi';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogImage, withSiteName, type SocialImage, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
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
 * Pages showing no data that would get outdated,
 * with a screenshot of their board in "assets/images/social-preview/<key>.jpg", without texts so same for all locales.
 * Other pages get an image generated from their title.
 */
const screenshotPages = ['hexplorer', 'swap_maps'];

/**
 * Builds meta from page path.
 */
@Service()
export default class StaticPageMetaBuilder implements SocialMetaBuilderInterface<string>
{
    /**
     * Generated images path, e.g /og/pages/tournaments.png
     */
    readonly imageType = 'pages';

    isPageKey(key: string): boolean
    {
        return Object.values(staticPages).includes(key);
    }

    texts(key: string, context: SocialMetaContext): { title: string, description: string }
    {
        return {
            title: context.t(`social_preview.static.${key}.title`),
            description: context.t(`social_preview.static.${key}.description`),
        };
    }

    /**
     * Changes when translations change.
     */
    imageVersion(key: string, context: SocialMetaContext): string
    {
        const { title, description } = this.texts(key, context);

        return createHash('sha256').update(JSON.stringify([title, description])).digest('hex').slice(0, 8);
    }

    private image(key: string, context: SocialMetaContext): SocialImage
    {
        const { title } = this.texts(key, context);

        if (!screenshotPages.includes(key)) {
            return ogImage(context, `${this.imageType}/${key}`, this.imageVersion(key, context), title);
        }

        return {
            url: `${context.baseUrl}/images/social-preview/${key}.jpg`,
            width: OG_IMAGE_WIDTH,
            height: OG_IMAGE_HEIGHT,
            alt: title,
        };
    }

    buildMeta(path: string, context: SocialMetaContext): null | Partial<SocialMeta>
    {
        const key = staticPages[path.replace(/\/+$/, '') || '/'];

        if (undefined === key) {
            return null;
        }

        const { title, description } = this.texts(key, context);

        return {
            title: withSiteName(title),
            description,
            image: this.image(key, context),
        };
    }
}
