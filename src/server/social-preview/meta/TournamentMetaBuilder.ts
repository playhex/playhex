import { Service } from 'typedi';
import type { Player, Tournament } from '../../../shared/app/models/index.js';
import { withSiteName, type JsonLd, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import { breadcrumbJsonLd, formatDateTime, formatIsoDate, joinTitle, personJsonLd, playerName, settingsLine, truncate } from './metaUtils.js';

const eventStatus = (tournament: Tournament): string => {
    switch (tournament.state) {
        case 'ended': return 'https://schema.org/EventCompleted';
        case 'canceled': return 'https://schema.org/EventCancelled';
        default: return 'https://schema.org/EventScheduled';
    }
};

@Service()
export default class TournamentMetaBuilder extends AbstractEntityMetaBuilder<Tournament>
{
    readonly imageType = 'tournaments';

    imageId(tournament: Tournament): string
    {
        return tournament.slug;
    }

    imageVersion(tournament: Tournament): string
    {
        return [
            tournament.state,
            this.playersCount(tournament),
            tournament.endedAt?.getTime() ?? tournament.startOfficialAt.getTime(),
        ].join('-');
    }

    url(tournament: Tournament, context: SocialMetaContext): string
    {
        return `${context.baseUrl}/tournaments/${encodeURIComponent(tournament.slug)}`;
    }

    /**
     * Podium players, by rank.
     */
    podium(tournament: Tournament): Player[]
    {
        return (tournament.participants ?? [])
            .filter(participant => typeof participant.rank === 'number' && participant.rank <= 3)
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
            .map(participant => participant.player)
        ;
    }

    playersCount(tournament: Tournament): number
    {
        return tournament.state === 'created'
            ? (tournament.subscriptions ?? []).length
            : (tournament.participants ?? []).length
        ;
    }

    /**
     * Lines displayed on tournament image, and used in description.
     */
    summaryLines(tournament: Tournament, context: SocialMetaContext): string[]
    {
        const { t } = context;
        const count = this.playersCount(tournament);
        const settings = settingsLine(tournament.boardsize, tournament.timeControlType, t);

        switch (tournament.state) {
            case 'created':
                return [
                    t('social_preview.tournament.starts_at', { date: formatDateTime(tournament.startOfficialAt, context) }),
                    settings,
                    t('social_preview.tournament.n_registered', { count }),
                ];

            case 'running':
                return [
                    t('social_preview.tournament.running'),
                    settings,
                    t('social_preview.tournament.n_participants', { count }),
                ];

            case 'ended': {
                const podium = this.podium(tournament);

                return [
                    ...podium.map((player, index) => t(`social_preview.tournament.rank_${index + 1}`, { player: playerName(player) })),
                    `${settings} · ${t('social_preview.tournament.n_participants', { count })}`,
                ];
            }

            case 'canceled':
                return [t('social_preview.tournament.canceled')];
        }
    }

    buildMeta(tournament: Tournament, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;

        if (tournament.hidden || tournament.state === 'canceled') {
            return {
                title: withSiteName(tournament.title),
                noindex: true,
            };
        }

        const lines = this.summaryLines(tournament, context);
        const url = this.url(tournament, context);
        const image = this.image(tournament, context, tournament.title);

        const description = tournament.description
            ? truncate(`${lines.join(' · ')}. ${tournament.description}`)
            : lines.join(' · ')
        ;

        const event: JsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: tournament.title,
            url,
            image: image.url,
            description,
            startDate: tournament.startOfficialAt.toISOString(),
            eventStatus: eventStatus(tournament),
            eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
            isAccessibleForFree: true,
            location: {
                '@type': 'VirtualLocation',
                url,
            },
        };

        if (tournament.endedAt) {
            event.endDate = tournament.endedAt.toISOString();
        }

        if (tournament.organizer) {
            event.organizer = personJsonLd(tournament.organizer, context);
        }

        if (tournament.series) {
            event.superEvent = {
                '@type': 'EventSeries',
                name: tournament.series.title,
                url: `${context.baseUrl}/tournament-series/${encodeURIComponent(tournament.series.slug)}`,
            };
        }

        return {
            title: withSiteName(joinTitle(tournament.title, t('social_preview.tournament.hex_tournament'), formatIsoDate(tournament.startedAt ?? tournament.startOfficialAt))),
            description,
            type: 'article',
            image,
            jsonLd: [
                event,
                breadcrumbJsonLd([
                    { name: t('tournaments'), url: `${context.baseUrl}/tournaments` },
                    { name: tournament.title, url },
                ]),
            ],
        };
    }
}
