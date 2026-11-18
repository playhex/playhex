import { Service } from 'typedi';
import type { Person } from 'schema-dts';
import type { Player } from '../../../shared/app/models/index.js';
import type { PlayerRetrospectiveData } from '../../../shared/app/retrospective/retrospectiveTypes.js';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { msToShortDuration, playerName, playerUrl } from './metaUtils.js';

export type RetrospectivePageData = {
    player: Player;
    year: number;
    shareCode: string;
    data: PlayerRetrospectiveData;
    computedAt: Date;
};

/**
 * Image id is "<year>-<shareCode>-<slug>", e.g "2026-aZ3kQ-alcalyn".
 * Contains share code: image is only reachable from a shared retrospective.
 */
export const parseRetrospectiveImageId = (id: string): null | { year: number, shareCode: string, slug: string } => {
    const match = /^(\d{4})-([A-Za-z0-9]{5})-(.+)$/.exec(id);

    return match ? { year: Number(match[1]), shareCode: match[2], slug: match[3] } : null;
};

@Service()
export default class RetrospectiveMetaBuilder extends AbstractEntityMetaBuilder<RetrospectivePageData>
{
    readonly imageType = 'retrospectives';

    imageId({ player, year, shareCode }: RetrospectivePageData): string
    {
        return `${year}-${shareCode}-${player.slug}`;
    }

    imageVersion({ player, computedAt }: RetrospectivePageData): string
    {
        return [
            computedAt.getTime(),
            player.avatarUpdatedAt?.getTime() ?? 0,
        ].join('-');
    }

    url({ player, year, shareCode }: RetrospectivePageData, context: SocialMetaContext): string
    {
        return `${playerUrl(player, context)}/retro/${year}/${shareCode}`;
    }

    title({ player, year }: RetrospectivePageData, context: SocialMetaContext): string
    {
        return context.t('social_preview.retrospective.title', { player: playerName(player), year });
    }

    /**
     * Key numbers, displayed on image.
     */
    summaryLines({ data }: RetrospectivePageData, context: SocialMetaContext): string[]
    {
        const { t } = context;
        const lines = [`${data.games1v1} ${t('social_preview.retrospective.games')}`];

        if (data.livePlaySeconds > 0) {
            lines.push(`${msToShortDuration(data.livePlaySeconds * 1000, t)} ${t('social_preview.retrospective.live_play')}`);
        }

        lines.push(`${data.activeDays} ${t('social_preview.retrospective.active_days')}`);

        if (data.bestTournament) {
            lines.push(`${data.bestTournament.title}: #${data.bestTournament.rank}`);
        }

        return lines;
    }

    private description({ player, data }: RetrospectivePageData, context: SocialMetaContext): string
    {
        const params = {
            player: playerName(player),
            games: data.games1v1,
            duration: msToShortDuration(data.livePlaySeconds * 1000, context.t),
        };

        return data.bestTournament
            ? context.t('social_preview.retrospective.description_tournament', { ...params, tournament: data.bestTournament.title, rank: data.bestTournament.rank })
            : context.t('social_preview.retrospective.description', params)
        ;
    }

    buildMeta(pageData: RetrospectivePageData, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { player, year } = pageData;
        const url = this.url(pageData, context);
        const title = this.title(pageData, context);

        const person: Person = {
            '@type': 'Person',
            '@id': `${playerUrl(player, context)}#person`,
            name: playerName(player),
            url: playerUrl(player, context),
            identifier: player.publicId,
        };

        return {
            title: withSiteName(title),
            description: this.description(pageData, context),
            image: this.image(pageData, context, context.t('social_preview.retrospective.image_alt', { player: playerName(player), year })),

            // Shareable, but not indexed, like players profiles
            noindex: true,

            jsonLd: [{
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                url,
                name: title,
                about: person,
            }],
        };
    }
}
