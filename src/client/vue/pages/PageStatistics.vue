<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useHead, useSeoMeta } from '@unhead/vue';
import { format } from 'date-fns';
import { t } from 'i18next';
import AppRhombus from '../components/AppRhombus.vue';
import {
    IconAlarmFill,
    IconAspectRatio,
    IconClockHistory,
    IconFlag,
    IconGraphUp,
    IconHexagonFill,
    IconHourglass,
    IconInfoCircle,
    IconLightningChargeFill,
    IconPalette,
    IconPeople,
    IconPeopleFill,
    IconPersonFill,
    IconPersonFillExclamation,
    IconRobot,
    IconSignpostSplit,
    IconStarFill,
    IconTrophy,
    IconTrophyFill,
} from '../icons.js';

type CategoryStats = {
    count: number;
    liveCount: number;
    correspondenceCount: number;
    meetsCount?: number;
    rankedCount: number;
    boardsizeCounts: Record<string, number>;
    movesCountByBoardsize: Record<string, { avg: number, median: number }>;
    redWinCount: number;
    blueWinCount: number;
    outcomeCounts: Record<string, number>;
    swapRuleEnabledCount: number;
    swapCount: number;
    totalStonesPlaced: number;
    stonesPlacedByHuman: number;
    stonesPlacedByBot?: number;
    activityHeatmap: number[][];
    openingMoveCountsByBoardsize: Record<string, Record<string, number>>;
};

type PeriodStats = {
    generatedAt: string;
    pvpOnly: CategoryStats;
    allGames: CategoryStats;
};

type CommonStats = {
    generatedAt: string;
    playerFlagCounts: Record<string, number>;
    boardOrientationCounts: { flat: number, diamond: number };
    shadingPatternCounts: Record<string, number>;
    ratingDistribution: Record<string, number>;
};

const RATING_MAX_DEVIATION = 250;

type Period = 'last-7-days' | 'last-28-days' | 'last-365-days' | 'overall';

const periods: { value: Period, labelKey: string }[] = [
    { value: 'last-7-days', labelKey: 'statistics.period.last_7_days' },
    { value: 'last-28-days', labelKey: 'statistics.period.last_28_days' },
    { value: 'last-365-days', labelKey: 'statistics.period.last_365_days' },
    { value: 'overall', labelKey: 'overall' },
];

const selectedPeriod = ref<Period>('overall');
const includeBotGames = ref<boolean>(false);

type LoadState<T> = null | false | 'not-generated' | T;

const periodStats = ref<LoadState<PeriodStats>>(null);
const commonStats = ref<LoadState<CommonStats>>(null);

useHead({
    title: t('statistics.title'),
});

useSeoMeta({
    description: t('statistics.seo_description'),
});

watchEffect(async () => {
    periodStats.value = null;

    const response = await fetch(`/stats/${selectedPeriod.value}.json`);

    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        periodStats.value = 'not-generated';
        return;
    }

    try {
        periodStats.value = await response.json();
    } catch (e) {
        periodStats.value = false;
    }
});

void (async () => {
    const response = await fetch('/stats/common.json');

    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        commonStats.value = 'not-generated';
        return;
    }

    try {
        commonStats.value = await response.json();
    } catch (e) {
        commonStats.value = false;
    }
})();

const displayedStats = computed<null | CategoryStats>(() => {
    if (!periodStats.value || typeof periodStats.value === 'string') {
        return null;
    }

    return includeBotGames.value
        ? periodStats.value.allGames
        : periodStats.value.pvpOnly
    ;
});

const percent = (count: number, total: number): number => {
    return total === 0 ? 0 : 100 * count / total;
};

const formatPercent = (count: number, total: number): string => {
    return percent(count, total).toFixed(1) + '%';
};

const sumOfCounts = (counts: Record<string, number>): number => {
    return Object.values(counts).reduce((sum, n) => sum + n, 0);
};

const sortedEntries = (counts: Record<string, number>): [string, number][] => {
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

const sortedBoardsizeEntries = <T, >(counts: Record<string, T>): [string, T][] => {
    return Object.entries(counts).sort((a, b) => +a[0] - +b[0]);
};

const mostPlayedBoardsizes = computed<{ main: [string, number][], restCount: number }>(() => {
    if (!displayedStats.value) {
        return { main: [], restCount: 0 };
    }

    const total = sumOfCounts(displayedStats.value.boardsizeCounts);
    const entries = sortedEntries(displayedStats.value.boardsizeCounts);
    const main = entries.filter(([, count]) => percent(count, total) >= 1);
    const restCount = entries
        .filter(([, count]) => percent(count, total) < 1)
        .reduce((sum, [, count]) => sum + count, 0)
    ;

    return { main, restCount };
});

const boardsizeLabel = (boardsize: string | number): string => `${boardsize}x${boardsize}`;

const shadingPatternLabel = (pattern: string): string => {
    return t(`shading_patterns.types.${pattern}`, { defaultValue: pattern });
};

const topBoardsize = computed<null | string>(() => {
    if (!displayedStats.value) {
        return null;
    }

    const entries = sortedEntries(displayedStats.value.boardsizeCounts);

    return entries.length > 0 ? entries[0][0] : null;
});

const topOpeningMoves = computed<[string, number][]>(() => {
    if (!displayedStats.value || topBoardsize.value === null) {
        return [];
    }

    const counts = displayedStats.value.openingMoveCountsByBoardsize[topBoardsize.value] ?? {};

    return sortedEntries(counts).slice(0, 5);
});

/**
 * Rounded to the nearest hour: fine for a fun stat, but fractional-offset timezones
 * (e.g UTC+5:30) will be off by up to 30 minutes.
 */
const timezoneOffsetHours = Math.round(-new Date().getTimezoneOffset() / 60);

const timezoneOffsetLabel = (timezoneOffsetHours >= 0 ? '+' : '') + timezoneOffsetHours;

const dayLabel = (dayOfWeek: number): string => format(new Date(2023, 0, 1 + dayOfWeek), 'EEE');

const localizedHeatmap = computed<null | number[][]>(() => {
    if (!displayedStats.value) {
        return null;
    }

    const source = displayedStats.value.activityHeatmap;
    const result: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            const shiftedIndex = (((day * 24 + hour + timezoneOffsetHours) % 168) + 168) % 168;
            result[Math.floor(shiftedIndex / 24)][shiftedIndex % 24] += source[day][hour];
        }
    }

    return result;
});

const maxHeatmapValue = computed<number>(() => {
    if (!localizedHeatmap.value) {
        return 0;
    }

    return Math.max(0, ...localizedHeatmap.value.flat());
});

const heatmapCellStyle = (count: number): Record<string, string> => {
    if (count === 0 || maxHeatmapValue.value === 0) {
        return {};
    }

    const alpha = Math.max(0.12, count / maxHeatmapValue.value);

    return { backgroundColor: `rgba(var(--bs-primary-rgb), ${alpha})` };
};

const sortedRatingBuckets = computed<[string, number][]>(() => {
    if (!commonStats.value || typeof commonStats.value === 'string') {
        return [];
    }

    return Object.entries(commonStats.value.ratingDistribution).sort((a, b) => +a[0] - +b[0]);
});

const maxRatingBucketCount = computed<number>(() => {
    return Math.max(0, ...sortedRatingBuckets.value.map(([, count]) => count));
});

const ratingBarHeight = (count: number): string => {
    return maxRatingBucketCount.value === 0 ? '0%' : `${100 * count / maxRatingBucketCount.value}%`;
};
</script>

<template>
    <div class="container my-3">
        <h1>{{ $t('statistics.title') }}</h1>

        <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
            <div class="btn-group btn-group-sm" role="group" aria-label="Select period">
                <template v-for="period in periods" :key="period.value">
                    <input
                        type="radio"
                        class="btn-check"
                        :id="'period-' + period.value"
                        v-model="selectedPeriod"
                        :value="period.value"
                        autocomplete="off"
                    >
                    <label class="btn btn-outline-primary" :for="'period-' + period.value">{{ $t(period.labelKey) }}</label>
                </template>
            </div>

            <div class="form-check form-switch mb-0">
                <input class="form-check-input" type="checkbox" role="switch" id="include-bot-games" v-model="includeBotGames">
                <label class="form-check-label" for="include-bot-games">{{ $t('statistics.include_bot_games') }}</label>
            </div>
        </div>

        <div class="alert alert-secondary d-flex align-items-start gap-2 small">
            <IconInfoCircle class="mt-1 flex-shrink-0" />
            <div>
                {{ $t('statistics.info_note') }}
                <span v-if="periodStats && 'object' === typeof periodStats">
                    <br>{{ $t('statistics.generated_at', { date: periodStats.generatedAt }) }}
                </span>
            </div>
        </div>

        <p v-if="false === periodStats" class="text-danger">{{ $t('statistics.error_loading') }}</p>
        <div v-else-if="'not-generated' === periodStats" class="alert alert-warning">
            <p class="mb-2">Statistics have not been generated yet. An admin should run the following command:</p>
            <pre class="bg-body-tertiary p-2 rounded mb-0"><code>yarn hex generate-stats</code></pre>
        </div>
        <p v-else-if="null === periodStats || null === displayedStats">{{ $t('loading') }}</p>
        <div v-else>
            <h2 class="h4"><IconGraphUp class="me-2" />{{ $t('statistics.games') }}</h2>

            <div class="row row-cols-2 row-cols-md-3 g-2 mb-4">
                <div class="col">
                    <div class="border rounded p-3 text-center h-100">
                        <div class="text-secondary small">{{ $t('statistics.total_games') }}</div>
                        <div class="fs-4">{{ displayedStats.count }}</div>
                    </div>
                </div>
                <div v-if="undefined !== displayedStats.meetsCount" class="col">
                    <div class="border rounded p-3 text-center h-100">
                        <div class="text-secondary small"><IconPeopleFill class="me-1" />{{ $t('statistics.distinct_player_pairs_met') }}</div>
                        <div class="fs-4">{{ displayedStats.meetsCount }}</div>
                        <div class="form-text mb-0">{{ $t('statistics.distinct_player_pairs_met_help') }}</div>
                    </div>
                </div>
                <div class="col">
                    <div class="border rounded p-3 text-center h-100">
                        <div class="text-secondary small">{{ $t('statistics.swap_rate') }}</div>
                        <div class="fs-4">{{ displayedStats.swapCount }}</div>
                        <div class="text-secondary small">{{ formatPercent(displayedStats.swapCount, displayedStats.swapRuleEnabledCount) }}</div>
                        <div class="form-text mb-0">{{ $t('statistics.swap_rate_help') }}</div>
                    </div>
                </div>
            </div>

            <div class="row row-cols-1 row-cols-md-3 g-3 mb-4">
                <div class="col">
                    <div class="row row-cols-2 small mb-1">
                        <div class="col text-start">
                            <div><IconLightningChargeFill class="me-1 text-success" />{{ $t('time_cadency.normal') }}</div>
                            <div class="fw-bold">{{ displayedStats.liveCount }}</div>
                            <div class="text-secondary">({{ formatPercent(displayedStats.liveCount, displayedStats.liveCount + displayedStats.correspondenceCount) }})</div>
                        </div>
                        <div class="col text-end">
                            <div>{{ $t('time_cadency.correspondence') }}<IconHourglass class="ms-1 text-warning" /></div>
                            <div class="fw-bold">{{ displayedStats.correspondenceCount }}</div>
                            <div class="text-secondary">({{ formatPercent(displayedStats.correspondenceCount, displayedStats.liveCount + displayedStats.correspondenceCount) }})</div>
                        </div>
                    </div>
                    <div class="progress" role="progressbar">
                        <div
                            class="progress-bar bg-success"
                            :style="{ width: percent(displayedStats.liveCount, displayedStats.liveCount + displayedStats.correspondenceCount) + '%' }"
                        ></div>
                        <div
                            class="progress-bar bg-warning"
                            :style="{ width: percent(displayedStats.correspondenceCount, displayedStats.liveCount + displayedStats.correspondenceCount) + '%' }"
                        ></div>
                    </div>
                </div>

                <div class="col">
                    <div class="row row-cols-2 small mb-1">
                        <div class="col text-start">
                            <div><IconTrophyFill class="me-1 text-danger" />{{ $t('statistics.red_wins') }}</div>
                            <div class="fw-bold">{{ displayedStats.redWinCount }}</div>
                            <div class="text-secondary">({{ formatPercent(displayedStats.redWinCount, displayedStats.redWinCount + displayedStats.blueWinCount) }})</div>
                        </div>
                        <div class="col text-end">
                            <div>{{ $t('statistics.blue_wins') }}<IconTrophyFill class="ms-1 text-primary" /></div>
                            <div class="fw-bold">{{ displayedStats.blueWinCount }}</div>
                            <div class="text-secondary">({{ formatPercent(displayedStats.blueWinCount, displayedStats.redWinCount + displayedStats.blueWinCount) }})</div>
                        </div>
                    </div>
                    <div class="progress" role="progressbar">
                        <div
                            class="progress-bar bg-danger"
                            :style="{ width: percent(displayedStats.redWinCount, displayedStats.redWinCount + displayedStats.blueWinCount) + '%' }"
                        ></div>
                        <div
                            class="progress-bar bg-primary"
                            :style="{ width: percent(displayedStats.blueWinCount, displayedStats.redWinCount + displayedStats.blueWinCount) + '%' }"
                        ></div>
                    </div>
                </div>

                <div class="col">
                    <div class="row row-cols-2 small mb-1">
                        <div class="col text-start">
                            <div><IconTrophy class="me-1 text-warning" />{{ $t('ranked') }}</div>
                            <div class="fw-bold">{{ displayedStats.rankedCount }}</div>
                            <div class="text-secondary">({{ formatPercent(displayedStats.rankedCount, displayedStats.count) }})</div>
                        </div>
                        <div class="col text-end">
                            <div>{{ $t('friendly') }}<IconPeople class="ms-1 text-success" /></div>
                            <div class="fw-bold">{{ displayedStats.count - displayedStats.rankedCount }}</div>
                            <div class="text-secondary">({{ formatPercent(displayedStats.count - displayedStats.rankedCount, displayedStats.count) }})</div>
                        </div>
                    </div>
                    <div class="progress" role="progressbar">
                        <div
                            class="progress-bar bg-warning"
                            :style="{ width: percent(displayedStats.rankedCount, displayedStats.count) + '%' }"
                        ></div>
                        <div
                            class="progress-bar bg-success"
                            :style="{ width: percent(displayedStats.count - displayedStats.rankedCount, displayedStats.count) + '%' }"
                        ></div>
                    </div>
                </div>
            </div>

            <h2 class="h4"><IconTrophyFill class="me-2" />{{ $t('statistics.outcome_breakdown') }}</h2>

            <ul class="list-group list-group-flush mb-4">
                <li v-if="displayedStats.outcomeCounts.path" class="list-group-item d-flex justify-content-between align-items-center">
                    <span><IconSignpostSplit class="me-2 text-secondary" />{{ $t('outcome.path') }}</span>
                    <span class="badge text-bg-secondary rounded-pill">{{ displayedStats.outcomeCounts.path }} ({{ formatPercent(displayedStats.outcomeCounts.path, displayedStats.count) }})</span>
                </li>
                <li v-if="displayedStats.outcomeCounts.resign" class="list-group-item d-flex justify-content-between align-items-center">
                    <span><IconFlag class="me-2 text-secondary" />{{ $t('outcome.resign') }}</span>
                    <span class="badge text-bg-secondary rounded-pill">{{ displayedStats.outcomeCounts.resign }} ({{ formatPercent(displayedStats.outcomeCounts.resign, displayedStats.count) }})</span>
                </li>
                <li v-if="displayedStats.outcomeCounts.time" class="list-group-item d-flex justify-content-between align-items-center">
                    <span><IconAlarmFill class="me-2 text-secondary" />{{ $t('outcome.time') }}</span>
                    <span class="badge text-bg-secondary rounded-pill">{{ displayedStats.outcomeCounts.time }} ({{ formatPercent(displayedStats.outcomeCounts.time, displayedStats.count) }})</span>
                </li>
                <li v-if="displayedStats.outcomeCounts.forfeit" class="list-group-item d-flex justify-content-between align-items-center">
                    <span><IconPersonFillExclamation class="me-2 text-secondary" />{{ $t('outcome.forfeit') }}</span>
                    <span class="badge text-bg-secondary rounded-pill">{{ displayedStats.outcomeCounts.forfeit }} ({{ formatPercent(displayedStats.outcomeCounts.forfeit, displayedStats.count) }})</span>
                </li>
            </ul>

            <h2 class="h4"><IconClockHistory class="me-2" />{{ $t('statistics.activity') }}</h2>

            <div class="table-responsive">
                <table class="table table-sm heatmap-table mb-1">
                    <thead>
                        <tr>
                            <th class="day-col"></th>
                            <th v-for="hour in 24" :key="hour" class="text-center small text-secondary fw-normal">{{ hour - 1 }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="day in 7" :key="day">
                            <th class="day-col small text-secondary fw-normal">{{ dayLabel(day - 1) }}</th>
                            <td
                                v-for="hour in 24"
                                :key="hour"
                                class="heatmap-cell"
                                :style="heatmapCellStyle(localizedHeatmap?.[day - 1]?.[hour - 1] ?? 0)"
                                :title="String(localizedHeatmap?.[day - 1]?.[hour - 1] ?? 0)"
                            ></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="form-text mb-4">{{ $t('statistics.activity_note', { offset: timezoneOffsetLabel }) }}</div>

            <h2 class="h4 mt-4"><IconStarFill class="me-2" />{{ $t('statistics.most_played_boardsizes') }}</h2>

            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>{{ $t('statistics.boardsize') }}</th>
                            <th class="text-end">{{ $t('statistics.games_column') }}</th>
                            <th class="text-end">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="[boardsize, count] in mostPlayedBoardsizes.main" :key="boardsize">
                            <td>{{ boardsizeLabel(boardsize) }}</td>
                            <td class="text-end">{{ count }}</td>
                            <td class="text-end">{{ formatPercent(count, sumOfCounts(displayedStats.boardsizeCounts)) }}</td>
                        </tr>
                        <tr v-if="mostPlayedBoardsizes.restCount > 0">
                            <td class="text-secondary">{{ $t('statistics.other_boardsizes') }}</td>
                            <td class="text-end text-secondary">{{ mostPlayedBoardsizes.restCount }}</td>
                            <td class="text-end text-secondary">{{ formatPercent(mostPlayedBoardsizes.restCount, sumOfCounts(displayedStats.boardsizeCounts)) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h2 class="h4 mt-4"><IconAspectRatio class="me-2" />{{ $t('statistics.boardsizes_and_game_length') }}</h2>

            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>{{ $t('statistics.boardsize') }}</th>
                            <th class="text-end">{{ $t('statistics.games_column') }}</th>
                            <th class="text-end">%</th>
                            <th class="text-end">{{ $t('statistics.avg_moves') }}</th>
                            <th class="text-end">{{ $t('statistics.median_moves') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="[boardsize, count] in sortedBoardsizeEntries(displayedStats.boardsizeCounts)" :key="boardsize">
                            <td>{{ boardsizeLabel(boardsize) }}</td>
                            <td class="text-end">{{ count }}</td>
                            <td class="text-end">{{ formatPercent(count, sumOfCounts(displayedStats.boardsizeCounts)) }}</td>
                            <td class="text-end">{{ displayedStats.movesCountByBoardsize[boardsize]?.avg.toFixed(1) ?? '–' }}</td>
                            <td class="text-end">{{ displayedStats.movesCountByBoardsize[boardsize]?.median ?? '–' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="commonStats && 'object' === typeof commonStats" class="row row-cols-1 row-cols-md-2 g-4 mt-4">
            <div class="col">
                <h3 class="h5"><IconGraphUp class="me-2" />{{ $t('statistics.rating_distribution') }}</h3>
                <div class="d-flex gap-1 rating-chart">
                    <div v-for="[bucket, count] in sortedRatingBuckets" :key="bucket" class="rating-col">
                        <div
                            class="rating-bar"
                            :style="{ height: ratingBarHeight(count) }"
                            :title="`${bucket}-${+bucket + 99}: ${count}`"
                        ></div>
                        <div class="rating-label text-secondary">{{ bucket }}</div>
                    </div>
                </div>
                <div class="form-text">{{ $t('statistics.rating_distribution_note', { deviation: RATING_MAX_DEVIATION }) }}</div>
            </div>

            <div v-if="displayedStats && topOpeningMoves.length > 0" class="col">
                <h3 class="h5"><IconSignpostSplit class="me-2" />{{ $t('statistics.opening_moves') }}</h3>
                <ul class="list-group list-group-flush">
                    <li
                        v-for="[move, count] in topOpeningMoves"
                        :key="move"
                        class="list-group-item d-flex justify-content-between align-items-center"
                    >
                        {{ move }}
                        <span class="badge text-bg-secondary rounded-pill">{{ count }} ({{ formatPercent(count, sumOfCounts(displayedStats.openingMoveCountsByBoardsize[topBoardsize ?? ''] ?? {})) }})</span>
                    </li>
                </ul>
                <div class="form-text">{{ $t('statistics.opening_moves_note', { boardsize: boardsizeLabel(topBoardsize ?? '') }) }}</div>
            </div>
        </div>

        <h2 class="mt-5">{{ $t('statistics.fun_facts') }}</h2>

        <p v-if="false === commonStats" class="text-danger">{{ $t('statistics.error_loading') }}</p>
        <div v-else-if="'not-generated' === commonStats" class="alert alert-warning">
            <p class="mb-2">Statistics have not been generated yet. An admin should run the following command:</p>
            <pre class="bg-body-tertiary p-2 rounded mb-0"><code>yarn hex generate-stats</code></pre>
        </div>
        <p v-else-if="null === commonStats">{{ $t('loading') }}</p>
        <div v-else class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4">
            <div v-if="displayedStats" class="col">
                <h3 class="h5"><IconHexagonFill class="me-2" />{{ $t('statistics.stones_placed') }}</h3>
                <div class="row row-cols-2 g-2">
                    <div class="col">
                        <div class="border rounded p-3 text-center h-100">
                            <div class="text-secondary small">{{ $t('statistics.total') }}</div>
                            <div class="fs-4">{{ displayedStats.totalStonesPlaced }}</div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="border rounded p-3 text-center h-100">
                            <div class="text-secondary small"><IconPersonFill class="me-1" />{{ $t('statistics.by_humans') }}</div>
                            <div class="fs-4">{{ displayedStats.stonesPlacedByHuman }}</div>
                            <div class="text-secondary small">{{ formatPercent(displayedStats.stonesPlacedByHuman, displayedStats.totalStonesPlaced) }}</div>
                        </div>
                    </div>
                    <div v-if="undefined !== displayedStats.stonesPlacedByBot" class="col">
                        <div class="border rounded p-3 text-center h-100">
                            <div class="text-secondary small"><IconRobot class="me-1" />{{ $t('statistics.by_bots') }}</div>
                            <div class="fs-4">{{ displayedStats.stonesPlacedByBot }}</div>
                            <div class="text-secondary small">{{ formatPercent(displayedStats.stonesPlacedByBot, displayedStats.totalStonesPlaced) }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col">
                <h3 class="h5"><IconFlag class="me-2" />{{ $t('statistics.player_flags') }}</h3>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <tbody>
                            <tr v-for="[flag, count] in sortedEntries(commonStats.playerFlagCounts)" :key="flag">
                                <td class="fs-5">{{ flag }}</td>
                                <td class="text-end">{{ count }}</td>
                                <td class="text-end">{{ formatPercent(count, sumOfCounts(commonStats.playerFlagCounts)) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="col">
                <h3 class="h5"><IconPalette class="me-2" />{{ $t('statistics.shading_patterns') }}</h3>
                <ul class="list-group list-group-flush">
                    <li
                        v-for="[pattern, count] in sortedEntries(commonStats.shadingPatternCounts)"
                        :key="pattern"
                        class="list-group-item d-flex justify-content-between align-items-center"
                    >
                        {{ shadingPatternLabel(pattern) }}
                        <span class="badge text-bg-secondary rounded-pill">{{ count }} ({{ formatPercent(count, sumOfCounts(commonStats.shadingPatternCounts)) }})</span>
                    </li>
                </ul>
            </div>

            <div class="col">
                <h3 class="h5"><IconAspectRatio class="me-2" />{{ $t('statistics.board_orientation') }}</h3>
                <div class="position-relative d-flex border rounded overflow-hidden">
                    <div class="flex-fill text-center p-3">
                        <div class="orientation-preview"><AppRhombus :orientation="0" /></div>
                        <div class="text-secondary small">{{ $t('board_orientation.flat') }}</div>
                        <div class="fs-4">{{ formatPercent(commonStats.boardOrientationCounts.flat, commonStats.boardOrientationCounts.flat + commonStats.boardOrientationCounts.diamond) }}</div>
                        <div class="text-secondary small">{{ commonStats.boardOrientationCounts.flat }}</div>
                    </div>
                    <div class="flex-fill text-center p-3 border-start">
                        <div class="orientation-preview"><AppRhombus :orientation="11" /></div>
                        <div class="text-secondary small">{{ $t('board_orientation.diamond') }}</div>
                        <div class="fs-4">{{ formatPercent(commonStats.boardOrientationCounts.diamond, commonStats.boardOrientationCounts.flat + commonStats.boardOrientationCounts.diamond) }}</div>
                        <div class="text-secondary small">{{ commonStats.boardOrientationCounts.diamond }}</div>
                    </div>
                    <div class="position-absolute top-50 start-50 translate-middle bg-body border rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm">
                        <IconLightningChargeFill class="text-warning" />
                    </div>
                </div>
                <div class="form-text">
                    {{ $t('statistics.board_orientation_help') }}
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.orientation-preview
    display flex
    justify-content center

    :deep(.rhombus)
        margin 0

.heatmap-table
    table-layout fixed
    width 100%

    th, td
        border none
        padding 1px

    .day-col
        width 3em

    td.heatmap-cell
        height 1.2em
        background-color var(--bs-secondary-bg)

.rating-chart
    height 8em

.rating-col
    width 1.6em
    flex 0 0 auto
    height 100%
    display flex
    flex-direction column
    justify-content flex-end
    align-items center

.rating-bar
    width 100%
    min-height 2px
    background-color unquote('rgba(var(--bs-primary-rgb), 0.6)')
    border-radius 2px 2px 0 0

.rating-label
    font-size 0.65em
    white-space nowrap
</style>
