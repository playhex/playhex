import { Service } from 'typedi';
import type { HexplorerStudy } from '../../../shared/app/models/index.js';
import type { CreativeWork, WithContext } from 'schema-dts';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { boardsizeString, breadcrumbJsonLd, joinTitle, personJsonLd, playerName } from './metaUtils.js';

@Service()
export default class HexplorerStudyMetaBuilder extends AbstractEntityMetaBuilder<HexplorerStudy>
{
    readonly imageType = 'hexplorer-studies';

    imageId(study: HexplorerStudy): string
    {
        return study.publicId;
    }

    imageVersion(study: HexplorerStudy): string
    {
        return String(study.updatedAt?.getTime() ?? 0);
    }

    url(study: HexplorerStudy, context: SocialMetaContext): string
    {
        return `${context.baseUrl}/hexplorer/${encodeURIComponent(study.publicId)}`;
    }

    title(study: HexplorerStudy, context: SocialMetaContext): string
    {
        return study.title || context.t('social_preview.hexplorer_study.default_title');
    }

    /**
     * "Hex 11×11 · by Alice"
     */
    private summary(study: HexplorerStudy, context: SocialMetaContext): string
    {
        const parts = [`Hex ${boardsizeString(study.data.boardsize)}`];

        if (study.author) {
            parts.push(context.t('social_preview.by', { author: playerName(study.author) }));
        }

        return parts.join(' · ');
    }

    buildMeta(study: HexplorerStudy, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const title = this.title(study, context);
        const url = this.url(study, context);
        const image = this.image(study, context, title);
        const description = this.summary(study, context);

        const creativeWork: WithContext<CreativeWork> = {
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: title,
            url,
            image: image.url,
            description,
            isAccessibleForFree: true,
        };

        if (study.author) {
            creativeWork.author = personJsonLd(study.author, context);
        }

        const hexStudyBy = study.author
            ? t('social_preview.hexplorer_study.hex_study_by', { author: playerName(study.author) })
            : null
        ;

        return {
            title: withSiteName(study.title ? joinTitle(study.title, hexStudyBy) : (hexStudyBy ?? title)),
            description,
            type: 'article',
            image,

            // Anyone can create one, even guests: can be shared, but is not indexed
            noindex: true,

            jsonLd: [creativeWork, breadcrumbJsonLd([
                { name: t('hexplorer.title'), url: `${context.baseUrl}/hexplorer` },
                { name: title, url },
            ])],
        };
    }
}
