<script setup lang="ts">
import { formatEndedAt } from '../../services/formatEndedAt.js';
import { computed, ref } from 'vue';
import { t } from 'i18next';
import { intlFormat } from 'date-fns';
import { autoLocale } from '../../../shared/app/i18n/index.js';
import { useSeoMeta } from '@unhead/vue';
import { Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartData, ChartOptions, TimeScale, Colors } from 'chart.js';
import { Bar } from 'vue-chartjs';
import zoomPlugin from 'chartjs-plugin-zoom';
import '../../services/chartJsDateFnsAdapter.js';
import SearchGamesParameters, { createDefaultSearchGamesParameters } from '../../../shared/app/SearchGamesParameters.js';
import { statsGroupings, StatsGrouping } from '../../../shared/app/GamesStatsParameters.js';
import { Game } from '../../../shared/app/models/index.js';
import AppSearchGamesParameters from '../components/AppSearchGamesParameters.vue';
import { getGames, getGamesStats } from '../../apiClient.js';
import AppPseudo from '../components/AppPseudo.vue';
import AppGameRulesSummary from '../components/AppGameRulesSummary.vue';
import AppTimeControlLabel from '../components/AppTimeControlLabel.vue';
import AppGameListIcons from '../components/AppGameListIcons.vue';
import AppPaginationButtons from '../components/AppPaginationButtons.vue';
import AppGameTypeIcon from '../components/AppGameTypeIcon.vue';
import { getGameType, getStrictLoserPlayer, getStrictWinnerPlayer } from '../../../shared/app/gameUtils.js';
import { useSearchGamesPagination } from '../composables/searchGamesPagination.js';
import { useSearchGamesSyncHash } from '../composables/searchGamesSyncHash.js';
import { useSerialRequest } from '../composables/useSerialRequest.js';

useSeoMeta({
    title: 'Games archive',
});

const gamesHistory = ref<null | Game[]>(null);
const totalResults = ref<null | number>(null);

const DEFAULT_PAGE_SIZE = 15;

const defaultSearchGamesParameters = createDefaultSearchGamesParameters();

const searchGamesParameters = ref<SearchGamesParameters>({
    ...createDefaultSearchGamesParameters(),
    paginationPageSize: DEFAULT_PAGE_SIZE,
    paginationPage: 0,
});

useSearchGamesSyncHash(searchGamesParameters);

const { totalPages, goPagePrevious, goPageNext } = useSearchGamesPagination(
    searchGamesParameters,
    totalResults,
    DEFAULT_PAGE_SIZE,
);

// Re-search games when changing filters
const { loading: gamesLoading } = useSerialRequest(searchGamesParameters, async () => {
    const { results, count } = await getGames(searchGamesParameters.value);

    gamesHistory.value = results;
    totalResults.value = count;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameChart.value as any)?.chart.resetZoom('zoom');
});

/*
 * Chart
 */
Chart.register(CategoryScale, LinearScale, TimeScale, BarElement, zoomPlugin, Title, Tooltip, Legend, Colors);

const gameChart = ref<HTMLElement>();
const gamesChartData = ref<null | ChartData<'bar', { x: Date, y: number }[]>>(null);

// Stats do not depend on pagination
const statsSearchParameters = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { paginationPage, paginationPageSize, ...filters } = searchGamesParameters.value;
    return filters;
});

const chartGroupingChoices = ['auto', ...statsGroupings] as const;
type ChartGroupingChoice = typeof chartGroupingChoices[number];

const chartGroupingChoice = ref<ChartGroupingChoice>('auto');

const SIX_MONTHS_MS = 183 * 86400 * 1000;

/**
 * Auto: by week when showing more than 6 months, else by day.
 * No start date means all history, so by week.
 */
const chartGrouping = computed((): StatsGrouping => {
    if (chartGroupingChoice.value !== 'auto') {
        return chartGroupingChoice.value;
    }

    const { fromEndedAt, toEndedAt } = statsSearchParameters.value;

    if (undefined === fromEndedAt) {
        return 'week';
    }

    const to = toEndedAt ?? new Date();

    return to.getTime() - fromEndedAt.getTime() > SIX_MONTHS_MS
        ? 'week'
        : 'day'
    ;
});

/**
 * Grouping of currently displayed data, updated with data,
 * so that chart unit always matches data.
 */
const displayedChartGrouping = ref<StatsGrouping>('week');

useSerialRequest(() => JSON.stringify([statsSearchParameters.value, chartGrouping.value]), async () => {
    const groupBy = chartGrouping.value;
    const gamesStats = await getGamesStats({ ...statsSearchParameters.value, groupBy });

    displayedChartGrouping.value = groupBy;
    gamesChartData.value = {
        datasets: [
            {
                data: gamesStats.map(g => ({
                    x: g.date,
                    y: g.totalGames,
                })),
            },
        ],
    };
});

const timeRangeUpdated = (from: Date, to: Date) => {
    searchGamesParameters.value.fromEndedAt = from;
    searchGamesParameters.value.toEndedAt = to;
};

const timeRangeReset = () => {
    searchGamesParameters.value.fromEndedAt = undefined;
    searchGamesParameters.value.toEndedAt = undefined;
};

const formatPeriod = (date: Date, grouping: StatsGrouping): string => {
    switch (grouping) {
        case 'day':
            return intlFormat(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, { locale: autoLocale() });

        case 'week':
            return t('week_of', {
                date: intlFormat(date, { day: 'numeric', month: 'short', year: 'numeric' }, { locale: autoLocale() }),
            });

        case 'month':
            return intlFormat(date, { month: 'long', year: 'numeric' }, { locale: autoLocale() });
    }
};

const gamesChartOptions = computed((): ChartOptions<'bar'> => ({
    scales: {
        x: {
            type: 'time',
            time: {
                minUnit: displayedChartGrouping.value,
                isoWeekday: true,
            },
        },
    },
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            callbacks: {
                title: items => formatPeriod((items[0].raw as { x: Date }).x, displayedChartGrouping.value),
            },
        },
        zoom: {
            zoom: {
                mode: 'x',
                drag: {
                    enabled: true,
                },
                onZoom: ({ chart }) => {
                    if (chart.getZoomLevel() === 1) {
                        timeRangeReset();
                    } else {
                        timeRangeUpdated(new Date(chart.scales.x.min), new Date(chart.scales.x.max));
                    }
                },
            },
        },
    },
    transitions: {
        zoom: {
            animation: {
                duration: 400,
            },
        },
    },
    animation: {
        duration: 200,
    },
    maintainAspectRatio: false,
}));

const chartBackgroundPlugin = {
    id: 'chartBackground',
    beforeDraw: (chart: InstanceType<typeof Chart>) => {
        const ctx = chart.canvas.getContext('2d');
        if (!ctx) return;
        const { left, top, right, bottom } = chart.chartArea;
        ctx.save();
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bs-body-bg').trim() || '#fff';
        ctx.fillRect(left, top, right - left, bottom - top);
        ctx.restore();
    },
};
</script>

<template>
    <div class="container-fluid">
        <div class="archive-layout">
            <div class="archive-header pt-3">
                <h1 class="h2 mb-3">Games archive</h1>

                <div class="d-flex justify-content-end mb-1">
                    <div class="btn-group btn-group-sm" role="group" :aria-label="$t('chart_grouping.label')">
                        <template v-for="choice in chartGroupingChoices" :key="choice">
                            <input
                                type="radio"
                                class="btn-check"
                                name="chart-grouping"
                                :id="`chart-grouping-${choice}`"
                                :value="choice"
                                v-model="chartGroupingChoice"
                            >
                            <label class="btn btn-outline-secondary" :for="`chart-grouping-${choice}`">{{ $t(`chart_grouping.${choice}`) }}</label>
                        </template>
                    </div>
                </div>

                <div class="chart-container">
                    <Bar
                        v-if="null !== gamesChartData"
                        :data="(gamesChartData as unknown as ChartData<'bar'>)"
                        :options="gamesChartOptions"
                        :plugins="[chartBackgroundPlugin]"
                        ref="gameChart"
                    />
                </div>
            </div>

            <aside class="filters-column py-3">
                <AppSearchGamesParameters
                    :searchGamesParameters
                    :defaults="defaultSearchGamesParameters"
                />
            </aside>

            <div class="archive-results pb-3" :class="{ 'results-loading': gamesLoading }" :aria-busy="gamesLoading">
                <p v-if="null !== totalResults">{{ $t('n_games_found', { count: totalResults }) }}</p>
                <p v-else>…</p>

                <div class="card">
                    <div class="card-header d-flex align-items-center gap-2">
                        <AppPaginationButtons :page="searchGamesParameters.paginationPage ?? 0" :totalPages @previous="goPagePrevious" @next="goPageNext" />
                    </div>

                    <div v-if="gamesHistory && gamesHistory.length > 0" class="table-responsive">
                        <table class="table text-nowrap mb-0">
                            <thead>
                                <tr>
                                    <th scope="col"></th>
                                    <th scope="col"></th>
                                    <th scope="col">{{ $t('game.winner') }}</th>
                                    <th scope="col">{{ $t('game.loser') }}</th>
                                    <th scope="col">{{ $t('game.issue') }}</th>
                                    <th scope="col">{{ $t('game.size') }}</th>
                                    <th scope="col">{{ $t('game.moves_count') }}</th>
                                    <th scope="col">{{ $t('game.time_control') }}</th>
                                    <th scope="col">{{ $t('game.rules') }}</th>
                                    <th scope="col"></th>
                                    <th scope="col">{{ $t('game.finished') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="game in gamesHistory"
                                    :key="game.publicId"
                                >
                                    <td class="ps-0">
                                        <router-link
                                            :to="{ name: 'online-game', params: { gameId: game.publicId } }"
                                            class="btn btn-sm btn-link"
                                        >Open</router-link>
                                    </td>

                                    <td><AppGameTypeIcon :gameType="getGameType(game)" /></td>

                                    <template v-if="'ended' === game.state && null !== game.winner">
                                        <td><AppPseudo :player="getStrictWinnerPlayer(game)" /></td>
                                        <td><AppPseudo :player="getStrictLoserPlayer(game)" /></td>
                                        <td>{{ game.outcome ? $t('game_outcome.' + game.outcome) : '-' }}</td>
                                    </template>
                                    <template v-else>
                                        <td colspan="2">
                                            <AppPseudo v-if="game.gameToPlayers[0]" :player="game.gameToPlayers[0].player" />
                                            <template v-if="game.gameToPlayers[1]">
                                                <span class="text-body-secondary mx-2">-</span>
                                                <AppPseudo :player="game.gameToPlayers[1].player" />
                                            </template>
                                        </td>
                                        <td>{{ 'canceled' === game.state ? $t('game_state.canceled') : '-' }}</td>
                                    </template>

                                    <td>{{ game.boardsize }}x{{ game.boardsize }}</td>

                                    <td>{{ game.moves.length }}</td>

                                    <td><AppTimeControlLabel :timeControlBoardsize="game" /></td>

                                    <td><AppGameRulesSummary :gameOptions="game" :host="game.host" /></td>

                                    <td><AppGameListIcons :game /></td>

                                    <td>{{ game.endedAt ? formatEndedAt(game.endedAt) : '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="gamesHistory && gamesHistory.length > 0" class="card-footer d-flex align-items-center gap-2">
                        <AppPaginationButtons :page="searchGamesParameters.paginationPage ?? 0" :totalPages @previous="goPagePrevious" @next="goPageNext" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.archive-results
    transition opacity .15s

    &.results-loading
        opacity .5

// Small screens: chart, filters, then games.
// Larger screens: filters in a full height left column.
.archive-layout
    display grid
    grid-template-columns minmax(0, 1fr)
    grid-template-areas "header" "filters" "results"

    .archive-header
        grid-area header

    .filters-column
        grid-area filters

    .archive-results
        grid-area results

@media (min-width: 768px)
    .archive-layout
        grid-template-columns 15rem minmax(0, 1fr)
        grid-template-rows auto 1fr
        grid-template-areas "filters header" "filters results"
        column-gap 1.5rem

        .filters-column
            border-right var(--bs-border-width) solid var(--bs-border-color)
            padding-right 1rem
            min-height 100vh

@media (min-width: 1400px)
    .archive-layout
        grid-template-columns 17rem minmax(0, 1fr)

.chart-container
    height 250px
    position relative

    .chart-controls
        position absolute
        right 0
</style>
