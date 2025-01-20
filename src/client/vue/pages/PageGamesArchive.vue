<script setup lang="ts">
import { format } from 'date-fns';
import { ref, watchEffect } from 'vue';
import { useSeoMeta } from '@unhead/vue';
import { Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartData, ChartOptions, TimeScale, Colors } from 'chart.js';
import { Bar } from 'vue-chartjs';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import SearchGamesParameters from '../../../shared/app/SearchGamesParameters';
import { HostedGame } from '../../../shared/app/models';
import AppSearchGamesParameters from '../components/AppSearchGamesParameters.vue';
import { getGames, getGamesStats } from '../../apiClient';
import AppPseudo from '../components/AppPseudo.vue';
import AppGameRulesSummary from '../components/AppGameRulesSummary.vue';
import AppTimeControlLabel from '../components/AppTimeControlLabel.vue';
import { getStrictWinnerPlayer } from '@shared/app/hostedGameUtils';
import { useSearchGamesPagination } from '../composables/searchGamesPagination';
import { useSearchGamesSyncHash } from '../composables/searchGamesSyncHash';

useSeoMeta({
    title: 'Games archive',
});

const gamesHistory = ref<null | HostedGame[]>(null);
const totalResults = ref<null | number>(null);

const DEFAULT_PAGE_SIZE = 15;

// Defaults to last ended 1v1 to show fresh data, and not too much (filters out bot games, canceled...)
const searchGamesParameters = ref<SearchGamesParameters>({
    opponentType: 'player',
    states: ['ended'],
    endedAtSort: 'desc',
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
watchEffect(async () => {
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

watchEffect(async () => {
    const gamesStats = await getGamesStats(searchGamesParameters.value);

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

const gamesChartOptions: ChartOptions<'bar'> = {
    scales: {
        x: {
            type: 'time',
            time: {
                minUnit: 'day',
            },
        },
    },
    plugins: {
        legend: {
            display: false,
        },
        zoom: {
            zoom: {
                mode: 'x',
                drag: {
                    enabled: true,
                },
                onZoom: ({ chart }) => {
                    if (1 === chart.getZoomLevel()) {
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
};
</script>

<template>
    <div class="container-fluid my-3">
        <h1 class="h2 mb-3">Games archive</h1>

        <div class="chart-container">
            <Bar
                v-if="null !== gamesChartData"
                :data="(gamesChartData as unknown as ChartData<'bar'>)"
                :options="gamesChartOptions"
                ref="gameChart"
            />
        </div>

        <AppSearchGamesParameters :searchGamesParameters />

        <p v-if="null !== totalResults">{{ $t('n_total_games', { count: totalResults }) }}</p>
        <p v-else>…</p>

        <div class="mt-3">
            <button @click="goPagePrevious" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) < 1 }">{{ $t('previous') }}</button>
            <span class="mx-3">{{ $t('page_page_of_max', { page: (searchGamesParameters.paginationPage ?? 0) + 1, max: totalPages }) }}</span>
            <button @click="goPageNext" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) + 1 >= totalPages }">{{ $t('next') }}</button>
        </div>

        <div v-if="gamesHistory && gamesHistory.length > 0" class="table-responsive">
            <table class="table mb-0">
                <thead>
                    <tr>
                        <th scope="col"></th>
                        <th scope="col"></th>
                        <th scope="col">{{ $t('game.red') }}</th>
                        <th scope="col">{{ $t('game.blue') }}</th>
                        <th scope="col">{{ $t('game.outcome') }}</th>
                        <th scope="col">{{ $t('game.size') }}</th>
                        <th scope="col">{{ $t('game.time_control') }}</th>
                        <th scope="col">{{ $t('game.rules') }}</th>
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

                        <td>
                            <span v-if="game.gameOptions.ranked" class="text-warning">
                                {{ $t('ranked') }}
                            </span>
                            <span v-else class="text-success">
                                {{ $t('friendly') }}
                            </span>
                        </td>

                        <td>
                            <AppPseudo v-if="game.hostedGameToPlayers[0]" :player="game.hostedGameToPlayers[0].player" classes="text-danger" />
                            <span v-else>-</span>
                        </td>

                        <td>
                            <AppPseudo v-if="game.hostedGameToPlayers[1]" :player="game.hostedGameToPlayers[1].player" classes="text-primary" />
                            <span v-else>-</span>
                        </td>

                        <td v-if="'canceled' === game.state">{{ $t('game_state.canceled') }}</td>
                        <td v-else>
                            <span v-if="null !== game.gameData && null !== game.gameData.winner">
                                <AppPseudo :player="getStrictWinnerPlayer(game)" :classes="0 === game.gameData.winner ? 'text-danger' : 'text-primary'" />
                                {{ ' ' }}
                                <small>+ {{ $t('outcome.' + (game.gameData.outcome ?? 'win')) }}</small>
                            </span>
                            <span v-else>-</span>
                        </td>

                        <td>{{ game.gameOptions.boardsize }}</td>

                        <td><AppTimeControlLabel :gameOptions="game.gameOptions" /></td>

                        <td><AppGameRulesSummary :gameOptions="game.gameOptions" /></td>

                        <td>{{
                            game.gameData?.endedAt ? format(game.gameData.endedAt, 'd MMMM yyyy p') : '-'
                        }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="gamesHistory && gamesHistory.length > 0" class="mt-3">
            <button @click="goPagePrevious" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) < 1 }">{{ $t('previous') }}</button>
            <span class="mx-3">{{ $t('page_page_of_max', { page: (searchGamesParameters.paginationPage ?? 0) + 1, max: totalPages }) }}</span>
            <button @click="goPageNext" class="btn btn-outline-primary" :class="{ disabled: (searchGamesParameters.paginationPage ?? 0) + 1 >= totalPages }">{{ $t('next') }}</button>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.chart-container
    height 250px
    position relative

    .chart-controls
        position absolute
        right 0
</style>
