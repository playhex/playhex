import { Service } from 'typedi';
import type { ExternalGame } from '../../../shared/app/models/index.js';
import { withSiteName, type JsonLd, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { boardsizeString, formatDate, formatIsoDate, joinTitle } from './metaUtils.js';

/**
 * Game not played on PlayHex (Little Golem, real life...), always ended.
 * Players are only names, not linked to PlayHex profiles.
 */
@Service()
export default class ExternalGameMetaBuilder extends AbstractEntityMetaBuilder<ExternalGame>
{
    readonly imageType = 'external-games';

    imageId(externalGame: ExternalGame): string
    {
        return externalGame.publicId;
    }

    /**
     * External game can be edited, e.g moves fixed by importing it again.
     */
    imageVersion(externalGame: ExternalGame): string
    {
        return String(externalGame.updatedAt?.getTime() ?? externalGame.moves.length);
    }

    /**
     * Player 0 (red, first move) first, then player 1 (blue).
     */
    playerNames(externalGame: ExternalGame): [string, string]
    {
        return [externalGame.player0Name, externalGame.player1Name];
    }

    /**
     * Rating on source, as displayed on source, e.g "1870.9".
     */
    ratings(externalGame: ExternalGame): [null | string, null | string]
    {
        return [externalGame.player0Rating, externalGame.player1Rating];
    }

    /**
     * Date the game was played.
     */
    date(externalGame: ExternalGame): Date
    {
        return externalGame.endedAt ?? externalGame.startedAt ?? externalGame.createdAt;
    }

    private playerWithRating(name: string, rating: null | string): string
    {
        return rating ? `${name} (${rating})` : name;
    }

    buildMeta(externalGame: ExternalGame, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const [red, blue] = this.playerNames(externalGame);
        const [redRating, blueRating] = this.ratings(externalGame);
        const versus = `${this.playerWithRating(red, redRating)} vs ${this.playerWithRating(blue, blueRating)}`;
        const winner = externalGame.winner === null ? null : this.playerNames(externalGame)[externalGame.winner];
        const date = this.date(externalGame);
        const movesCount = externalGame.moves.filter(move => move !== 'pass').length;

        const details: string[] = [
            `Hex ${boardsizeString(externalGame.boardsize)}`,
            ...(externalGame.source ? [externalGame.source] : []),
            ...(externalGame.event ? [externalGame.event] : []),
            t('social_preview.game.n_moves', { count: movesCount }),
            formatDate(date, context),
        ];

        const outcome = winner === null
            ? null
            : t(`social_preview.game.outcome_${externalGame.outcome ?? 'path'}`, { winner })
        ;

        const description = outcome === null
            ? details.join(' · ')
            : `${outcome}. ${details.join(' · ')}`
        ;

        const title = joinTitle(versus, winner && t('social_preview.game.winner', { winner }), formatIsoDate(date));
        const image = this.image(externalGame, context, t('social_preview.game.image_alt', { title: versus }));

        const jsonLd: JsonLd = {
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name: `${red} vs ${blue}`,
            sport: 'Hex',
            url: context.url,
            description,
            eventStatus: 'https://schema.org/EventCompleted',
            competitor: [
                { '@type': 'Person', name: red },
                { '@type': 'Person', name: blue },
            ],
            endDate: date.toISOString(),
            image: image.url,
        };

        if (externalGame.startedAt) {
            jsonLd.startDate = externalGame.startedAt.toISOString();
        }

        return {
            title: withSiteName(title),
            description,
            type: 'article',
            image,
            jsonLd: [jsonLd],
        };
    }
}
