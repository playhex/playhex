import { t } from 'i18next';
import type { BreadcrumbItem } from '../../components/AppBreadcrumb.vue';
import type Tournament from '../../../../shared/app/models/Tournament.js';

const home = (): BreadcrumbItem => ({ label: t('breadcrumb.home'), to: { name: 'home' } });
const tournaments = (): BreadcrumbItem => ({ label: t('tournaments'), to: { name: 'tournaments' } });
const series = (): BreadcrumbItem => ({ label: t('breadcrumb.series'), to: { name: 'tournament-series' } });

export const tournamentsBreadcrumb = (): BreadcrumbItem[] => [
    home(),
    { label: t('tournaments') },
];

/**
 * @param lastLabel When set, "Series" becomes a link and this label is the current page.
 */
export const tournamentSeriesListBreadcrumb = (lastLabel?: string): BreadcrumbItem[] => {
    const items = [home(), tournaments()];

    if (undefined === lastLabel) {
        return [...items, { label: t('breadcrumb.series') }];
    }

    return [...items, series(), { label: lastLabel }];
};

export const tournamentSeriesBreadcrumb = (seriesTitle: string): BreadcrumbItem[] => [
    home(),
    tournaments(),
    series(),
    { label: seriesTitle },
];

/**
 * "Home > Tournaments > Series > Hex Monthly > Hex Monthly 42" when tournament is in a series,
 * "Home > Tournaments > Hex Monthly 42" otherwise.
 */
export const tournamentBreadcrumb = (tournament: Tournament, lastLabel?: string): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [home(), tournaments()];

    if (tournament.series) {
        items.push(
            series(),
            {
                label: tournament.series.title,
                to: { name: 'tournament-series-show', params: { slug: tournament.series.slug } },
            },
        );
    }

    if (undefined === lastLabel) {
        items.push({ label: tournament.title });
    } else {
        items.push(
            { label: tournament.title, to: { name: 'tournament', params: { slug: tournament.slug } } },
            { label: lastLabel },
        );
    }

    return items;
};
