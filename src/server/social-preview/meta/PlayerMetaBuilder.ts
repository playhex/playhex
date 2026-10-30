import { Service } from 'typedi';
import type { Player, PlayerStats } from '../../../shared/app/models/index.js';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { formatDate, playerName, playerUrl } from './metaUtils.js';

export type PlayerPageData = {
    player: Player;
    stats: null | PlayerStats;
};

@Service()
export default class PlayerMetaBuilder extends AbstractEntityMetaBuilder<PlayerPageData>
{
    readonly imageType = 'players';

    imageId({ player }: PlayerPageData): string
    {
        return player.slug;
    }

    imageVersion({ player, stats }: PlayerPageData): string
    {
        return [
            player.avatarUpdatedAt?.getTime() ?? 0,
            this.rating(player) ?? 0,
            stats?.totalPlayedGames ?? 0,
        ].join('-');
    }

    rating(player: Player): null | number
    {
        return player.currentRating
            ? Math.round(player.currentRating.rating)
            : null
        ;
    }

    /**
     * Games count and registration date, if any.
     */
    statsLines({ player, stats }: PlayerPageData, context: SocialMetaContext): string[]
    {
        const { t } = context;
        const lines: string[] = [];

        if (stats) {
            lines.push(t('social_preview.player.n_games', { count: stats.totalPlayedGames }));
        }

        if (!player.isBot && !player.isGuest) {
            lines.push(t('social_preview.player.member_since', { date: formatDate(player.registeredAt ?? player.createdAt, context) }));
        }

        return lines;
    }

    private summaryLines(data: PlayerPageData, context: SocialMetaContext): string[]
    {
        const { t } = context;
        const rating = this.rating(data.player);
        const lines: string[] = [];

        if (data.player.isBot) {
            lines.push(t('social_preview.player.bot'));
        }

        if (rating !== null) {
            lines.push(t('social_preview.player.rating', { rating }));
        }

        return [...lines, ...this.statsLines(data, context)];
    }

    buildMeta(data: PlayerPageData, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const { player } = data;
        const name = playerName(player);
        const url = playerUrl(player, context);

        const person: { [key: string]: unknown } = {
            '@type': 'Person',
            '@id': `${url}#person`,
            name,
            url,
            identifier: player.publicId,
        };

        if (player.avatarPath) {
            person.image = context.baseUrl + player.avatarPath;
        }

        if (player.countryFlag) {
            person.nationality = player.countryFlag.toUpperCase();
        }

        return {
            title: withSiteName(t('social_preview.player.title', { player: name })),
            description: this.summaryLines(data, context).join(' · '),
            type: 'profile',
            image: this.image(data, context, name),

            // Same as client side: only bots are indexed, players profiles are not
            noindex: !player.isBot,

            jsonLd: [{
                '@context': 'https://schema.org',
                '@type': 'ProfilePage',
                url,
                mainEntity: person,
            }],
        };
    }
}
