import { createHash } from 'node:crypto';
import { Service } from 'typedi';
import { defaultSocialImage, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogImage, withSiteName, type SocialImage, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import { seo } from '../../../shared/app/seo.js';
import { tutorialSeoKey, tutorialSeoPath, tutorialSeoSteps } from '../../../shared/app/tutorial/tutorialSteps.js';
import type { SocialMetaBuilderInterface } from './SocialMetaBuilderInterface.js';
import { staticPagesJsonLd } from './staticPagesJsonLd.js';

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
    '/guide/ai-analysis': 'guide_ai_analysis',
    '/guide/conditional-moves': 'guide_conditional_moves',
    ...Object.fromEntries(tutorialSeoSteps.map(step => [tutorialSeoPath(step), tutorialSeoKey(step)])),
    '/tournoi-hex-paris-2025': 'cijm_2025',
    '/tournoi-hex-paris-2026': 'cijm_2026',
    '/export-games-data': 'export_games_data',
};

/**
 * Pages with same meta as another page, which is their canonical url.
 */
const aliasedPages: { [path: string]: string } = {
    '/tutorial': '/tutorial/rules',
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

    /**
     * Static pages meta, and json-ld of pages listed in staticPagesJsonLd.
     * Home page keeps default title and description, only gets json-ld.
     */
    buildMeta(path: string, context: SocialMetaContext): null | Partial<SocialMeta>
    {
        const normalizedPath = path.replace(/\/+$/, '') || '/';
        const aliasedPath: undefined | string = aliasedPages[normalizedPath];

        if (undefined !== aliasedPath) {
            return { ...this.buildMeta(aliasedPath, context), url: `${context.baseUrl}${aliasedPath}` };
        }

        const key: undefined | string = staticPages[normalizedPath];
        const jsonLdBuilder = staticPagesJsonLd[normalizedPath];

        if (undefined === key && undefined === jsonLdBuilder) {
            return null;
        }

        const texts = undefined === key
            ? { title: seo.title, description: context.t('social_preview.default_description') }
            : this.texts(key, context)
        ;

        const image = undefined === key ? defaultSocialImage(context.baseUrl) : this.image(key, context);

        // Home page keeps default meta, only gets json-ld
        const meta: Partial<SocialMeta> = undefined === key ? {} : {
            title: withSiteName(texts.title),
            description: texts.description,
            image,
        };

        if (undefined !== jsonLdBuilder) {
            meta.jsonLd = jsonLdBuilder({ ...context, ...texts, image: image.url });
        }

        return meta;
    }
}
