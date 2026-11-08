import { playerGender } from '../../../shared/app/playerPronouns.js';
import { Service } from 'typedi';
import type { Game, Player } from '../../../shared/app/models/index.js';
import type { SportsEvent, WithContext } from 'schema-dts';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { tournamentMatchFullTitle } from '../../../shared/app/tournamentUtils.js';
import { boardsizeString, formatDate, formatIsoDate, formatTimeControl, joinTitle, personJsonLd, playerName, tournamentEventJsonLd } from './metaUtils.js';

@Service()
export default class GameMetaBuilder extends AbstractEntityMetaBuilder<Game>
{
    readonly imageType = 'games';

    imageId(game: Game): string
    {
        return game.publicId;
    }

    /**
     * An ended game never changes,
     * a running game image shows current position,
     * and a waiting game image only shows its host.
     */
    imageVersion(game: Game): string
    {
        switch (game.state) {
            case 'ended': return String(game.endedAt?.getTime() ?? game.moves.length);
            case 'playing': return `playing-${game.moves.length}`;
            default: return `${game.state}-${game.gameToPlayers.length}`;
        }
    }

    /**
     * Red first, then blue.
     */
    orderedPlayers(game: Game): Player[]
    {
        return [...game.gameToPlayers]
            .sort((a, b) => a.order - b.order)
            .map(gameToPlayer => gameToPlayer.player)
        ;
    }

    /**
     * Rating of player after this game, rounded, only for ranked games.
     */
    rating(game: Game, player: Player): null | number
    {
        if (!game.ranked) {
            return null;
        }

        const rating = game.ratings?.find(rating => rating.player?.id === player.id && rating.category === 'overall');

        return rating ? Math.round(rating.rating) : null;
    }

    private playerWithRating(game: Game, player: Player): string
    {
        const rating = this.rating(game, player);

        return rating === null
            ? playerName(player)
            : `${playerName(player)} (${rating})`
        ;
    }

    buildMeta(game: Game, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const players = this.orderedPlayers(game);
        const boardsize = boardsizeString(game.boardsize);

        if (game.state === 'canceled') {
            return {
                title: withSiteName(t('social_preview.game.canceled_title')),
                description: t('social_preview.game.canceled_description', { boardsize }),
                noindex: true,
            };
        }

        if (players.length < 2) {
            const host = players[0] ?? game.host ?? null;

            const title = host
                ? t('social_preview.game.waiting_title', { player: playerName(host) })
                : t('social_preview.game.waiting_title_anonymous')
            ;

            return {
                title: withSiteName(title),
                description: t('social_preview.game.waiting_description', { boardsize, timeControl: formatTimeControl(game.timeControlType, t) }),
                image: this.image(game, context, title),
                noindex: true,
            };
        }

        const [red, blue] = players;
        const versus = `${this.playerWithRating(game, red)} vs ${this.playerWithRating(game, blue)}`;
        const tournamentMatchTitle = game.tournamentMatch?.tournament ? tournamentMatchFullTitle(game.tournamentMatch, t) : null;
        const settings: string[] = [
            `Hex ${boardsize}`,
            game.ranked ? t('social_preview.game.ranked') : t('social_preview.game.friendly'),
            formatTimeControl(game.timeControlType, t),
        ];

        // Tournament or ladder
        const details: string[] = [];

        if (game.tournamentMatch?.tournament) {
            details.push(game.tournamentMatch.tournament.title);
        } else if (game.ladderChallenge) {
            details.push(t('ladder.title'));
        }

        if (game.state !== 'ended' || game.winner === null) {
            return {
                title: withSiteName(joinTitle(tournamentMatchTitle, versus)),
                description: [...settings, ...details].join(' · ') + '. ' + t('social_preview.game.playing_description'),
                image: this.image(game, context, versus),
                noindex: true,
            };
        }

        const winner = players[game.winner];
        const outcome = t(`social_preview.game.outcome_${game.outcome ?? 'path'}`, { winner: playerName(winner), context: playerGender(winner) });
        const movesCount = game.moves.filter(move => move !== 'pass').length;

        details.push(t('social_preview.game.n_moves', { count: movesCount }));

        if (game.endedAt) {
            details.push(formatDate(game.endedAt, context));
        }

        const title = joinTitle(tournamentMatchTitle, versus, t('social_preview.game.winner', { winner: playerName(winner), context: playerGender(winner) }), game.endedAt && formatIsoDate(game.endedAt));

        const jsonLd: WithContext<SportsEvent> = {
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name: `${playerName(red)} vs ${playerName(blue)}`,
            sport: 'Hex',
            url: context.url,
            description: `${outcome}. ${details.join(' · ')}`,
            // No EventCompleted in schema.org: past events stay EventScheduled
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
            location: {
                '@type': 'VirtualLocation',
                url: context.url,
            },
            competitor: [personJsonLd(red, context), personJsonLd(blue, context)],
        };

        const startDate = game.startedAt ?? game.endedAt;

        if (startDate) {
            jsonLd.startDate = startDate.toISOString();
        }

        if (game.endedAt) {
            jsonLd.endDate = game.endedAt.toISOString();
        }

        if (game.tournamentMatch?.tournament) {
            jsonLd.superEvent = tournamentEventJsonLd(game.tournamentMatch.tournament, context);
        }

        const image = this.image(game, context, t('social_preview.game.image_alt', { title: versus }));

        jsonLd.image = image.url;

        return {
            title: withSiteName(title),
            description: `${outcome}. ${details.join(' · ')}`,
            type: 'article',
            image,
            jsonLd: [jsonLd],
        };
    }
}
