import { Service } from 'typedi';
import type { Tournament, TournamentSeries } from '../../../shared/app/models/index.js';
import { withSiteName, type SocialMeta, type SocialMetaContext } from '../SocialMeta.js';
import AbstractEntityMetaBuilder from './AbstractEntityMetaBuilder.js';
import TournamentMetaBuilder from './TournamentMetaBuilder.js';
import { breadcrumbJsonLd, formatDate, joinTitle, truncate } from './metaUtils.js';

export type TournamentSeriesPageData = {
    series: TournamentSeries;
    tournaments: Tournament[];
};

@Service()
export default class TournamentSeriesMetaBuilder extends AbstractEntityMetaBuilder<TournamentSeriesPageData>
{
    readonly imageType = 'tournament-series';

    constructor(
        private tournamentMetaBuilder: TournamentMetaBuilder,
    ) {
        super();
    }

    imageId({ series }: TournamentSeriesPageData): string
    {
        return series.slug;
    }

    imageVersion({ tournaments }: TournamentSeriesPageData): string
    {
        const next = this.nextTournament(tournaments);

        return [
            next?.publicId ?? 'none',
            next?.startOfficialAt.getTime() ?? 0,
            this.editionsCount(tournaments),
        ].join('-');
    }

    url(series: TournamentSeries, context: SocialMetaContext): string
    {
        return `${context.baseUrl}/tournament-series/${encodeURIComponent(series.slug)}`;
    }

    /**
     * Next edition not started yet, if any.
     */
    nextTournament(tournaments: Tournament[]): null | Tournament
    {
        return tournaments
            .filter(tournament => tournament.state === 'created' && !tournament.hidden)
            .sort((a, b) => a.startOfficialAt.getTime() - b.startOfficialAt.getTime())[0]
            ?? null
        ;
    }

    private editionsCount(tournaments: Tournament[]): number
    {
        return tournaments.filter(tournament => tournament.state === 'ended').length;
    }

    summaryLines(tournaments: Tournament[], context: SocialMetaContext): string[]
    {
        const { t } = context;
        const next = this.nextTournament(tournaments);
        const lines: string[] = [];

        if (next) {
            lines.push(t('social_preview.tournament_series.next', { title: next.title, date: formatDate(next.startOfficialAt, context) }));
        }

        lines.push(t('social_preview.tournament_series.n_editions', { count: this.editionsCount(tournaments) }));

        return lines;
    }

    buildMeta(data: TournamentSeriesPageData, context: SocialMetaContext): Partial<SocialMeta>
    {
        const { t } = context;
        const { series, tournaments } = data;
        const url = this.url(series, context);
        const lines = this.summaryLines(tournaments, context);
        const description = series.description
            ? truncate(`${lines.join(' · ')}. ${series.description}`)
            : lines.join(' · ')
        ;

        const image = this.image(data, context, series.title);

        return {
            title: withSiteName(joinTitle(series.title, t('social_preview.tournament_series.hex_tournaments'))),
            description,
            image,
            jsonLd: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'EventSeries',
                    name: series.title,
                    url,
                    image: image.url,
                    description,
                    subEvent: tournaments
                        .filter(tournament => !tournament.hidden && tournament.state !== 'canceled')
                        .slice(0, 10)
                        .map(tournament => ({
                            '@type': 'Event',
                            name: tournament.title,
                            url: this.tournamentMetaBuilder.url(tournament, context),
                            startDate: tournament.startOfficialAt.toISOString(),
                        })),
                },
                breadcrumbJsonLd([
                    { name: t('tournament_series_list_page.title'), url: `${context.baseUrl}/tournament-series` },
                    { name: series.title, url },
                ]),
            ],
        };
    }
}
