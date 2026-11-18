<script lang="ts" setup>
import { type Component, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSeoMeta } from '@unhead/vue';
import { t } from 'i18next';
import { intlFormat } from 'date-fns';
import { getPlayerBySlug, apiGetPlayerRetrospective } from '../../../apiClient.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { compareTrend, topTournaments } from '../../../../shared/app/retrospective/retrospectiveRules.js';
import type { PlayerRetrospectiveData, RetrospectiveChallenge, RetrospectiveGameContext, RetrospectiveLink, RetrospectiveTournament, RetrospectiveTrend } from '../../../../shared/app/retrospective/retrospectiveTypes.js';
import { playerGender } from '../../../../shared/app/playerPronouns.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { Player } from '../../../../shared/app/models/index.js';
import { useShareLink } from '../../composables/useShareLink.js';
import { isMe } from '../../../services/context-utils.js';
import AppRetrospectiveTrend from '../components/AppRetrospectiveTrend.vue';
import AppRetrospectiveGauge from '../components/AppRetrospectiveGauge.vue';
import AppRetrospectiveGameBoard from '../components/AppRetrospectiveGameBoard.vue';
import { IconArrowLeft, IconArrowRight, IconBrain, IconCake2Fill, IconCalendarEvent, IconChatDots, IconCrown, IconGraphUp, IconHexagonFill, IconPeopleFill, IconRobot, IconShareFill, IconSkull, IconStarFill, IconStopwatch, IconTrophyFill } from '../../icons.js';

const route = useRoute();
const router = useRouter();
const slug = String(route.params.slug);
const year = Number(route.params.year);
const shareCode = String(route.params.shareCode);

const player = ref<null | Player>(null);
const retrospective = ref<null | PlayerRetrospectiveData>(null);
const notFound = ref(false);
const previousRetrospective = ref<null | RetrospectiveLink>(null);
const nextRetrospective = ref<null | RetrospectiveLink>(null);

useSeoMeta({
    robots: 'noindex',
    title: () => player.value
        ? t('retrospective.title_of', { player: player.value.pseudo, year })
        : t('retrospective.title', { year }),
});

void (async () => {
    try {
        const fetchedPlayer = await getPlayerBySlug(slug);

        if (fetchedPlayer.slug !== slug) {
            void router.replace({ name: 'player-retrospective', params: { slug: fetchedPlayer.slug, year, shareCode } });
            return;
        }

        player.value = fetchedPlayer;
        const response = await apiGetPlayerRetrospective(fetchedPlayer.publicId, year, shareCode);

        if (response === null) {
            notFound.value = true;
            return;
        }

        retrospective.value = response.retrospective;
        previousRetrospective.value = response.previous;
        nextRetrospective.value = response.next;
    } catch (e) {
        if (e instanceof DomainHttpError && e.type === 'player_not_found') {
            notFound.value = true;
            return;
        }

        throw e;
    }
})();

const { copiedResult, shareLink } = useShareLink(window.location.href);

/*
 * Formatting
 */
const formatNumber = (value: number): string => value.toLocaleString();

const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return hours > 0
        ? t('retrospective.duration_hours_minutes', { hours: formatNumber(hours), minutes })
        : t('retrospective.duration_minutes', { minutes })
    ;
};

/**
 * For long durations, i.e time as king: "12 d 5 h".
 */
const formatLongDuration = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);

    return days > 0
        ? t('retrospective.duration_days_hours', { days: formatNumber(days), hours: Math.floor((seconds % 86400) / 3600) })
        : formatDuration(seconds)
    ;
};

const formatPercent = (rate: number): string => String(Math.round(rate * 100));

/**
 * "1st", "2nd", "3rd", "4th"...
 */
const formatRank = (rank: number): string => t('retrospective.rank', { count: rank, ordinal: true });

/*
 * Progress compared to previous year
 */
const progress = computed(() => retrospective.value?.progress ?? null);

/**
 * Compares values, not top percents: arrow and color tell whether player did more than last year.
 */
const valueTrend = (current: number, previous: undefined | null | number): null | RetrospectiveTrend => {
    if (previous === undefined || previous === null) {
        return null;
    }

    return compareTrend(current, previous);
};

const previousLadder = (slug: string) => progress.value?.ladders.find(ladder => ladder.slug === slug) ?? null;

const accuracyTrend = computed((): null | RetrospectiveTrend => {
    const current = retrospective.value?.accuracy;
    const previous = progress.value?.accuracy;

    if (current === null || current === undefined || previous === null || previous === undefined) {
        return null;
    }

    // Ignore insignificant changes
    return Math.abs(current - previous) < 0.005 ? 'same' : compareTrend(current, previous);
});

const ratingTrend = computed((): null | RetrospectiveTrend => {
    const current = retrospective.value?.rating;
    const previous = progress.value?.rating;

    if (current === null || current === undefined || previous === null || previous === undefined) {
        return null;
    }

    return compareTrend(Math.round(current), Math.round(previous));
});

/*
 * Activity, secondary stats listed next to games count
 */
type ActivityItem = {
    key: string;
    icon: Component;
    value: string;
    label: string;
    topPercent?: number;
    trend?: null | RetrospectiveTrend;
    previous?: null | string;
};

const activityItems = computed((): ActivityItem[] => {
    const r = retrospective.value;

    if (r === null) {
        return [];
    }

    const items: ActivityItem[] = [];

    items.push({
        key: 'activeDays',
        icon: IconCalendarEvent,
        value: formatNumber(r.activeDays),
        label: t('retrospective.active_days', { count: r.activeDays }),
        topPercent: r.topPercents.activeDays,
        trend: valueTrend(r.activeDays, progress.value?.activeDays),
        previous: progress.value ? formatNumber(progress.value.activeDays) : null,
    });

    if (r.livePlaySeconds > 0) {
        items.push({
            key: 'livePlaySeconds',
            icon: IconStopwatch,
            value: formatDuration(r.livePlaySeconds),
            label: t('retrospective.live_play_time'),
            topPercent: r.topPercents.livePlaySeconds,
            trend: valueTrend(r.livePlaySeconds, progress.value?.livePlaySeconds),
            previous: progress.value ? formatDuration(progress.value.livePlaySeconds) : null,
        });
    }

    if (r.movesPlayed > 0) {
        items.push({
            key: 'movesPlayed',
            icon: IconHexagonFill,
            value: formatNumber(r.movesPlayed),
            label: t('retrospective.moves_played', { count: r.movesPlayed }),
            topPercent: r.topPercents.movesPlayed,
            trend: valueTrend(r.movesPlayed, progress.value?.movesPlayed),
            previous: progress.value ? formatNumber(progress.value.movesPlayed) : null,
        });
    }

    if (r.botGames > 0) {
        items.push({ key: 'botGames', icon: IconRobot, value: formatNumber(r.botGames), label: t('retrospective.bot_games', { count: r.botGames }) });
    }

    return items;
});

/*
 * Game context: tournament match or King of the Hill challenge
 */
const gameContextText = (context: RetrospectiveGameContext): null | string => {
    if (context.kind === 'tournament') {
        const match = context.tournamentMatchLabel
            ? t(`match_title.${context.tournamentMatchLabel}`, { round: context.tournamentRound, number: context.tournamentMatchNumber })
            : context.tournamentRound
                ? t('retrospective.game_context_round', { round: context.tournamentRound })
                : null
        ;

        return [t('retrospective.game_context_tournament'), context.tournamentTitle, match]
            .filter(Boolean)
            .join(', ')
        ;
    }

    if (context.kind === 'ladder' && context.ladderPlace) {
        return t('retrospective.game_context_ladder', { ladder: t('ladder.title', { context: playerGender(player.value) }), place: context.ladderPlace });
    }

    return null;
};

/**
 * Tournament or King of the Hill game, nothing to show for other games.
 */
const gameOfTheYearContext = computed((): null | string => retrospective.value?.gameOfTheYear ? gameContextText(retrospective.value.gameOfTheYear) : null);

const blunderContext = computed((): null | string => retrospective.value?.blunder ? gameContextText(retrospective.value.blunder.context) : null);

/*
 * Competition
 */
const bestTournaments = computed(() => topTournaments(retrospective.value?.tournaments ?? []));

/**
 * Podiums of the year, gold first.
 */
const podiums = computed(() => (retrospective.value?.tournaments ?? [])
    .filter(tournament => tournament.rank <= 3)
    .sort((a, b) => (a.rank - b.rank) || a.endedAt.localeCompare(b.endedAt)),
);

const podiumClass = (rank: number): null | string => ({ 1: 'rank-gold', 2: 'rank-silver', 3: 'rank-bronze' } as Record<number, string>)[rank] ?? null;

/**
 * Ladder name is only needed when player played in several ladders.
 */
const hasSeveralLadders = computed(() => (retrospective.value?.ladders.length ?? 0) > 1);

const ladderTitle = (ladderName: string): string => {
    const title = t('ladder.title', { context: playerGender(player.value) });

    return hasSeveralLadders.value ? `${title} · ${ladderName}` : title;
};

const challengeText = (challenge: RetrospectiveChallenge): string => {
    const withLadderName = (text: string, ladderName: string) => hasSeveralLadders.value ? `${text} (${ladderName})` : text;

    switch (challenge.type) {
        case 'tournament_podium': return t('retrospective.challenge.tournament_podium');
        case 'tournament_win': return t('retrospective.challenge.tournament_win');
        case 'beat_bot': return t('retrospective.challenge.beat_bot', { bot: challenge.bot.pseudo });
        case 'ladder_king': return withLadderName(t('retrospective.challenge.ladder_king', { context: playerGender(player.value) }), challenge.ladderName);
        case 'ladder_reclaim': return withLadderName(t('retrospective.challenge.ladder_reclaim'), challenge.ladderName);
        case 'ladder_defenses': return withLadderName(t('retrospective.challenge.ladder_defenses', { count: challenge.defenses }), challenge.ladderName);
    }
};

/*
 * Activity calendar: games, tournament results and best King of the Hill place, month by month
 */
type CalendarMonth = {
    month: number;
    label: string;
    games: number;
    tournaments: RetrospectiveTournament[];

    /**
     * Best King of the Hill place of the year, on the month it was reached.
     */
    ladderBestPosition: null | number;
};

const calendar = computed((): CalendarMonth[] => {
    const r = retrospective.value;

    if (r === null) {
        return [];
    }

    // Only one crown on the year: best place among all ladders, first reached
    const bestLadder = r.ladders
        .filter(ladder => ladder.bestPosition !== null && ladder.bestPositionAt !== null)
        .sort((a, b) => (a.bestPosition! - b.bestPosition!) || a.bestPositionAt!.localeCompare(b.bestPositionAt!))[0]
        ?? null
    ;
    const bestLadderMonth = bestLadder ? new Date(bestLadder.bestPositionAt!).getUTCMonth() : null;

    return r.gamesByMonth.map((games, month) => ({
        month,
        label: intlFormat(new Date(year, month, 1), { month: 'short' }, { locale: autoLocale() }),
        games,
        tournaments: r.tournaments.filter(tournament => new Date(tournament.endedAt).getUTCMonth() === month),
        ladderBestPosition: month === bestLadderMonth ? bestLadder.bestPosition : null,
    }));
});

const calendarMaxGames = computed(() => Math.max(1, ...calendar.value.map(month => month.games)));
</script>

<template>
    <div class="container my-3 retrospective">
        <div v-if="notFound" class="text-center my-5">
            <p class="lead">{{ $t('retrospective.not_found') }}</p>
            <router-link v-if="player && isMe(player)" :to="{ name: 'player-retrospectives', params: { slug: player.slug } }">{{ $t('retrospective.all_retrospectives') }}</router-link>
        </div>

        <p v-else-if="!retrospective" class="text-center my-5">…</p>

        <template v-else>
            <!-- Header -->
            <header class="text-center mb-5">
                <h1 class="display-5 fw-bold mb-2">
                    {{ $t('retrospective.title_of', { player: retrospective.player.pseudo, year }) }}
                </h1>
                <p class="fs-5 text-body-secondary mb-3">
                    <IconCake2Fill class="text-warning me-1" aria-hidden="true" /> {{ $t('retrospective.years_on_playhex', { count: retrospective.yearsOnPlayhex }) }}
                </p>
                <button type="button" class="btn btn-primary" @click="shareLink">
                    <IconShareFill /> {{ $t('retrospective.share') }}
                </button>
                <span v-if="copiedResult === true" class="ms-2 text-success">{{ $t('retrospective.link_copied') }}</span>
            </header>

            <!-- Level: one card, rating on top, then columns -->
            <section
                v-if="retrospective.rating || retrospective.rankedWins > 0 || retrospective.liveThinkingSeconds > 0 || retrospective.accuracy !== null"
                class="retro-section card retro-level"
            >
                <IconGraphUp class="retro-bg-icon" aria-hidden="true" />
                <div class="card-body p-4 position-relative">
                    <h2 class="retro-section-title text-center">{{ $t('retrospective.section.level') }}</h2>

                    <div v-if="retrospective.rating" class="text-center mb-4">
                        <div class="retro-rating">{{ Math.round(retrospective.rating) }}</div>
                        <div class="text-body-secondary mb-2">{{ $t('retrospective.rating') }}</div>
                        <AppRetrospectiveTrend
                            :topPercent="retrospective.topPercents.rating"
                            :topPercentTitle="$t('retrospective.rating_rank_explain')"
                            :trend="ratingTrend"
                            :previous="progress?.rating ? String(Math.round(progress.rating)) : null"
                            :previousYear="progress?.previousYear"
                        />
                    </div>

                    <div class="row g-4 text-center retro-level-columns">
                        <div v-if="retrospective.accuracy !== null" class="col-md">
                            <AppRetrospectiveGauge :value="retrospective.accuracy" />
                            <div :title="$t('retrospective.accuracy_explain', { count: retrospective.analyzedGamesCount })">{{ $t('retrospective.accuracy') }}</div>
                            <AppRetrospectiveTrend
                                :topPercent="retrospective.topPercents.accuracy"
                                :trend="accuracyTrend"
                                :previous="progress?.accuracy ? `${formatPercent(progress.accuracy)} %` : null"
                                :previousYear="progress?.previousYear"
                            />
                        </div>
                        <div v-if="retrospective.rankedWins > 0" class="col-md d-flex flex-column justify-content-center">
                            <div class="display-4 fw-bold">{{ formatNumber(retrospective.rankedWins) }}</div>
                            <div>{{ $t('retrospective.ranked_wins', { count: retrospective.rankedWins }) }}</div>
                            <div>
                                <AppRetrospectiveTrend
                                    :topPercent="retrospective.topPercents.rankedWins"
                                    :trend="valueTrend(retrospective.rankedWins, progress?.rankedWins)"
                                    :previous="progress ? formatNumber(progress.rankedWins) : null"
                                    :previousYear="progress?.previousYear"
                                />
                            </div>
                        </div>
                        <div v-if="retrospective.liveThinkingSeconds > 0" class="col-md d-flex flex-column justify-content-center">
                            <IconBrain class="text-primary fs-1 mx-auto mb-1" />
                            <div class="display-6 fw-bold">{{ formatDuration(retrospective.liveThinkingSeconds) }}</div>
                            <div>{{ $t('retrospective.live_thinking_time') }}</div>
                            <div>
                                <AppRetrospectiveTrend
                                    :topPercent="retrospective.topPercents.liveThinkingSeconds"
                                    :trend="valueTrend(retrospective.liveThinkingSeconds, progress?.liveThinkingSeconds)"
                                    :previous="progress ? formatDuration(progress.liveThinkingSeconds) : null"
                                    :previousYear="progress?.previousYear"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Strongest opponent beaten: board and text side by side -->
            <section v-if="retrospective.strongestOpponentBeaten" class="retro-section retro-strongest">
                <div class="row g-4 align-items-center">
                    <div class="col-md-7">
                        <router-link :to="{ name: 'online-game', params: { gameId: retrospective.strongestOpponentBeaten.gamePublicId } }" :title="$t('retrospective.review_game')" class="d-block">
                            <AppRetrospectiveGameBoard
                                :boardsize="retrospective.strongestOpponentBeaten.boardsize"
                                :swapRule="retrospective.strongestOpponentBeaten.swapRule"
                                :moves="retrospective.strongestOpponentBeaten.moves"
                                id="retrospective-strongest"
                            />
                        </router-link>
                    </div>
                    <div class="col-md-5 text-center text-md-start">
                        <h2 class="retro-section-title"><IconStarFill class="text-warning" /> {{ $t('retrospective.section.strongest_opponent') }}</h2>
                        <p class="display-6 fw-bold text-break mb-1">{{ retrospective.strongestOpponentBeaten.opponent.pseudo }}</p>
                        <p class="text-body-secondary">{{ $t('retrospective.strongest_opponent_explain') }}</p>
                        <router-link :to="{ name: 'online-game', params: { gameId: retrospective.strongestOpponentBeaten.gamePublicId } }" class="btn btn-outline-primary">{{ $t('retrospective.review_game') }}</router-link>
                    </div>
                </div>
            </section>

            <!-- Activity: one huge number, and a list of other stats -->
            <section class="retro-section">
                <h2 class="retro-section-title"><IconHexagonFill class="text-primary" /> {{ $t('retrospective.section.activity') }}</h2>
                <div class="row g-4 align-items-center">
                    <div class="col-md-5 text-center text-md-start">
                        <div class="retro-huge text-primary">{{ formatNumber(retrospective.games1v1) }}</div>
                        <div class="fs-4 mb-2">{{ $t('retrospective.games_1v1', { count: retrospective.games1v1 }) }}</div>
                        <AppRetrospectiveTrend
                            :topPercent="retrospective.topPercents.games1v1"
                            :trend="valueTrend(retrospective.games1v1, progress?.games1v1)"
                            :previous="progress ? formatNumber(progress.games1v1) : null"
                            :previousYear="progress?.previousYear"
                        />
                    </div>
                    <div class="col-md-7">
                        <ul class="list-unstyled mb-0 retro-activity-list">
                            <li v-for="item in activityItems" :key="item.key" class="d-flex align-items-center gap-3">
                                <span class="retro-activity-icon"><component :is="item.icon" /></span>
                                <div>
                                    <span class="fs-4 fw-bold me-1">{{ item.value }}</span>
                                    <span class="text-body-secondary">{{ item.label }}</span>
                                    <div>
                                        <AppRetrospectiveTrend
                                            :topPercent="item.topPercent"
                                            :trend="item.trend"
                                            :previous="item.previous"
                                            :previousYear="progress?.previousYear"
                                        />
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- Activity calendar: month by month -->
            <section class="retro-section">
                <h2 class="retro-section-title"><IconCalendarEvent class="text-primary" /> {{ $t('retrospective.section.calendar') }}</h2>
                <div class="retro-calendar">
                    <div v-for="month in calendar" :key="month.month" class="retro-month rounded-3 p-2" :style="{ '--retro-month-intensity': month.games / calendarMaxGames }">
                        <div class="d-flex justify-content-between align-items-start flex-wrap column-gap-1">
                            <span class="small text-uppercase retro-small-caps">{{ month.label }}</span>
                            <span
                                v-if="month.ladderBestPosition !== null"
                                class="text-warning fw-bold text-nowrap"
                                :title="$t('retrospective.calendar_ladder_best_position', { position: month.ladderBestPosition })"
                            ><IconCrown /> #{{ month.ladderBestPosition }}</span>
                        </div>
                        <div class="d-flex flex-wrap align-items-baseline column-gap-1">
                            <span class="fs-4 fw-bold">{{ formatNumber(month.games) }}</span>
                            <span class="small text-body-secondary">{{ $t('retrospective.month_games', { count: month.games }) }}</span>
                        </div>
                        <ul v-if="month.tournaments.length > 0" class="list-unstyled small mb-0 mt-1">
                            <li v-for="tournament in month.tournaments" :key="tournament.publicId" class="text-truncate">
                                <IconTrophyFill :class="podiumClass(tournament.rank) ? `text-${podiumClass(tournament.rank)}` : 'text-body-tertiary'" /> <strong>{{ formatRank(tournament.rank) }}</strong> <router-link :to="{ name: 'tournament', params: { slug: tournament.slug } }" class="link-body-emphasis" :title="tournament.title">{{ tournament.title }}</router-link>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- Blunder -->
            <section v-if="retrospective.blunder" class="retro-section">
                <div class="retro-feature border border-danger-subtle rounded-3 bg-danger-subtle text-center">
                    <IconSkull class="retro-bg-icon text-danger retro-blunder-icon" aria-hidden="true" />
                    <h2 class="retro-section-title position-relative">{{ $t('retrospective.section.blunder') }}</h2>
                    <p v-if="blunderContext" class="mb-1 position-relative">{{ blunderContext }}</p>
                    <p class="text-body-secondary mb-2 position-relative">
                        <i18next :translation="$t('retrospective.blunder_context')">
                            <template #player><strong class="fs-5 text-body-emphasis">{{ retrospective.blunder.opponent.pseudo }}</strong></template>
                        </i18next>
                    </p>
                    <router-link :to="{ name: 'online-game', params: { gameId: retrospective.blunder.gamePublicId } }" :title="$t('retrospective.review_game')" class="d-block mb-3 position-relative">
                        <AppRetrospectiveGameBoard
                            :boardsize="retrospective.blunder.boardsize"
                            :swapRule="retrospective.blunder.swapRule"
                            :moves="retrospective.blunder.moves"
                            :blunder="retrospective.blunder"
                            id="retrospective-blunder"
                        />
                    </router-link>
                    <p class="fs-5 fw-semibold mb-1 position-relative">{{ $t('retrospective.blunder_description', { move: retrospective.blunder.move }) }}</p>
                    <p v-if="retrospective.blunder.bestMove" class="text-body-secondary position-relative">{{ $t('retrospective.blunder_best_move', { move: retrospective.blunder.bestMove }) }}</p>
                    <router-link :to="{ name: 'online-game', params: { gameId: retrospective.blunder.gamePublicId } }" class="btn btn-outline-danger position-relative">{{ $t('retrospective.review_game') }}</router-link>
                </div>
            </section>

            <!-- Competition: a ranking -->
            <section v-if="retrospective.tournaments.length > 0" class="retro-section">
                <h2 class="retro-section-title"><IconTrophyFill class="text-warning" /> {{ $t('retrospective.section.competition') }}</h2>

                <p class="fs-4 mb-3">
                    <strong class="fs-2">{{ retrospective.tournaments.length }}</strong> {{ $t('retrospective.tournaments_played', { count: retrospective.tournaments.length }) }}
                    <span class="text-body-secondary mx-2">·</span>
                    <strong class="fs-2">{{ retrospective.tournamentMatchesWon }}</strong>
                    {{ $t('retrospective.tournament_matches_won_out_of', { count: retrospective.tournamentMatchesWon, total: retrospective.tournamentMatchesPlayed }) }}
                </p>

                <p v-if="podiums.length > 0" class="d-flex flex-wrap gap-1 fs-2 mb-3">
                    <span
                        v-for="tournament in podiums"
                        :key="tournament.publicId"
                        :title="`${formatRank(tournament.rank)} ${tournament.title}`"
                    ><IconTrophyFill :class="`text-${podiumClass(tournament.rank)}`" /></span>
                </p>

                <h3 class="h6 text-uppercase text-body-secondary retro-small-caps">{{ $t('retrospective.best_tournaments') }}</h3>
                <ol class="list-group mb-3">
                    <li v-for="(tournament, i) in bestTournaments" :key="tournament.publicId" class="list-group-item d-flex align-items-center gap-3" :class="{ 'py-3': i === 0 }">
                        <span class="retro-rank" :class="[podiumClass(tournament.rank), { 'retro-rank-first': i === 0 }]">{{ tournament.rank }}</span>
                        <div class="flex-fill">
                            <router-link :to="{ name: 'tournament', params: { slug: tournament.slug } }" class="link-body-emphasis" :class="{ 'fs-5 fw-semibold': i === 0 }">{{ tournament.title }}</router-link>
                            <div class="small text-body-secondary">{{ $t('retrospective.rank_out_of', { rank: formatRank(tournament.rank), count: tournament.participantsCount }) }}</div>
                        </div>
                    </li>
                </ol>
            </section>

            <!-- King of the Hill -->
            <section v-for="ladder in retrospective.ladders" :key="ladder.slug" class="retro-section retro-ladder rounded-3 text-center p-4">
                <IconCrown class="retro-bg-icon" aria-hidden="true" />
                <div class="position-relative">
                    <IconCrown class="text-warning retro-ladder-crown" />
                    <h2 class="retro-section-title">
                        <router-link :to="{ name: 'ladder', params: { slug: ladder.slug } }" class="link-body-emphasis">{{ ladderTitle(ladder.name) }}</router-link>
                    </h2>
                    <div class="d-flex justify-content-center flex-wrap retro-ladder-stats">
                        <div v-if="ladder.bestPosition !== null">
                            <div class="fs-1 fw-bold">#{{ ladder.bestPosition }}</div>
                            <div class="small text-body-secondary">{{ $t('retrospective.ladder_best_position') }}</div>
                            <AppRetrospectiveTrend
                                :trend="previousLadder(ladder.slug)?.bestPosition ? compareTrend(ladder.bestPosition, previousLadder(ladder.slug)!.bestPosition!, false) : null"
                                :previous="previousLadder(ladder.slug)?.bestPosition ? `#${previousLadder(ladder.slug)!.bestPosition}` : null"
                                :previousYear="progress?.previousYear"
                            />
                        </div>
                        <div v-if="ladder.challengesWon > 0">
                            <div class="fs-1 fw-bold">{{ ladder.challengesWon }}</div>
                            <div class="small text-body-secondary">{{ $t('retrospective.ladder_challenges_won', { count: ladder.challengesWon, total: ladder.challengesCount }) }}</div>
                        </div>
                        <div v-if="ladder.bestWinStreak > 1">
                            <div class="fs-1 fw-bold">{{ ladder.bestWinStreak }}</div>
                            <div class="small text-body-secondary">{{ $t('retrospective.ladder_best_win_streak') }}</div>
                        </div>
                    </div>

                    <div v-if="ladder.kingSeconds > 0" class="retro-ladder-reign d-flex justify-content-center flex-wrap rounded-3 mt-4 mx-auto p-3">
                        <div>
                            <div class="fs-2 fw-bold">{{ formatLongDuration(ladder.kingSeconds) }}</div>
                            <div class="small text-body-secondary">{{ $t('retrospective.ladder_time_as_king', { context: playerGender(player) }) }}</div>
                            <AppRetrospectiveTrend
                                :trend="valueTrend(ladder.kingSeconds, previousLadder(ladder.slug)?.kingSeconds)"
                                :previous="previousLadder(ladder.slug) ? formatLongDuration(previousLadder(ladder.slug)!.kingSeconds) : null"
                                :previousYear="progress?.previousYear"
                            />
                        </div>
                        <div>
                            <div class="fs-2 fw-bold">{{ ladder.defenses }}</div>
                            <div class="small text-body-secondary">{{ $t('retrospective.ladder_defenses', { count: ladder.defenses }) }}</div>
                            <AppRetrospectiveTrend
                                :trend="valueTrend(ladder.defenses, previousLadder(ladder.slug)?.defenses)"
                                :previous="previousLadder(ladder.slug) ? String(previousLadder(ladder.slug)!.defenses) : null"
                                :previousYear="progress?.previousYear"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <!-- Social: two tiles -->
            <section v-if="retrospective.rival || retrospective.distinctOpponents > 0 || retrospective.chatMessages > 0" class="retro-section">
                <h2 class="retro-section-title"><IconPeopleFill class="text-info" /> {{ $t('retrospective.section.social') }}</h2>
                <div class="row g-3">
                    <div v-if="retrospective.rival" class="col-md">
                        <div class="retro-social-tile rounded-3 h-100 p-4">
                            <IconPeopleFill class="retro-bg-icon" aria-hidden="true" />
                            <div class="position-relative">
                                <div class="small text-uppercase retro-small-caps">{{ $t('retrospective.rival') }}</div>
                                <router-link :to="{ name: 'player', params: { slug: retrospective.rival.opponent.slug } }" class="d-block fs-3 fw-bold text-break link-body-emphasis">{{ retrospective.rival.opponent.pseudo }}</router-link>
                                <div class="display-6 fw-bold">{{ retrospective.rival.wins }} – {{ retrospective.rival.losses }}</div>
                                <div class="small text-body-secondary">{{ $t('retrospective.rival_record') }}</div>
                            </div>
                        </div>
                    </div>
                    <div v-if="retrospective.distinctOpponents > 0" class="col-md">
                        <div class="retro-social-tile rounded-3 h-100 p-4">
                            <IconPeopleFill class="retro-bg-icon" aria-hidden="true" />
                            <div class="position-relative">
                                <div class="display-4 fw-bold">{{ formatNumber(retrospective.distinctOpponents) }}</div>
                                <div class="fs-5">{{ $t('retrospective.distinct_opponents', { count: retrospective.distinctOpponents }) }}</div>
                            </div>
                        </div>
                    </div>
                    <div v-if="retrospective.chatMessages > 0" class="col-md">
                        <div class="retro-social-tile rounded-3 h-100 p-4">
                            <IconChatDots class="retro-bg-icon" aria-hidden="true" />
                            <div class="position-relative">
                                <div class="display-4 fw-bold">{{ formatNumber(retrospective.chatMessages) }}</div>
                                <div class="fs-5">{{ $t('retrospective.chat_messages', { count: retrospective.chatMessages }) }}</div>
                                <AppRetrospectiveTrend
                                    :topPercent="retrospective.topPercents.chatMessages"
                                    :trend="valueTrend(retrospective.chatMessages, progress?.chatMessages)"
                                    :previous="progress ? formatNumber(progress.chatMessages) : null"
                                    :previousYear="progress?.previousYear"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Game of the year: dark scoreboard -->
            <section v-if="retrospective.gameOfTheYear" class="retro-section retro-goty rounded-3 text-center p-4 p-md-5">
                <IconStarFill class="retro-bg-icon" aria-hidden="true" />
                <div class="position-relative">
                    <h2 class="h6 text-uppercase retro-small-caps" :class="gameOfTheYearContext ? 'mb-1' : 'mb-4'">{{ $t('retrospective.section.game_of_the_year') }}</h2>
                    <p v-if="gameOfTheYearContext" class="retro-goty-context mb-4">{{ gameOfTheYearContext }}</p>
                    <div class="d-flex justify-content-center align-items-center flex-wrap gap-3 fs-3 fw-semibold mb-2">
                        <span>{{ retrospective.player.pseudo }}</span>
                        <span class="retro-goty-context fs-6">vs</span>
                        <span>{{ retrospective.gameOfTheYear.opponent.pseudo }}</span>
                    </div>
                    <p class="display-5 fw-bold text-uppercase text-success mb-4">{{ $t('retrospective.victory') }}</p>
                    <router-link :to="{ name: 'online-game', params: { gameId: retrospective.gameOfTheYear.gamePublicId } }" :title="$t('retrospective.review_game')" class="d-block mb-4">
                        <AppRetrospectiveGameBoard
                            :boardsize="retrospective.gameOfTheYear.boardsize"
                            :swapRule="retrospective.gameOfTheYear.swapRule"
                            :moves="retrospective.gameOfTheYear.moves"
                            id="retrospective-goty"
                        />
                    </router-link>
                    <router-link :to="{ name: 'online-game', params: { gameId: retrospective.gameOfTheYear.gamePublicId } }" class="btn btn-light">{{ $t('retrospective.review_game') }}</router-link>
                </div>
            </section>

            <!-- Challenges: a checklist -->
            <section v-if="retrospective.challenges.length > 0" class="retro-section retro-challenges rounded-3 p-4">
                <h2 class="retro-section-title text-center">{{ $t('retrospective.section.challenges', { year: year + 1 }) }}</h2>
                <ul class="list-unstyled mb-0 mx-auto retro-challenges-list">
                    <li v-for="(challenge, i) in retrospective.challenges" :key="i" class="d-flex align-items-center gap-3 fs-5">
                        <span class="retro-checkbox" aria-hidden="true" />
                        <IconRobot v-if="challenge.type === 'beat_bot'" class="text-info flex-shrink-0" />
                        <IconCrown v-else-if="challenge.type.startsWith('ladder_')" class="text-warning flex-shrink-0" />
                        <IconTrophyFill v-else class="text-warning flex-shrink-0" />
                        <span>{{ challengeText(challenge) }}</span>
                    </li>
                </ul>
            </section>

            <div class="text-center mb-4">
                <button type="button" class="btn btn-primary btn-lg" @click="shareLink">
                    <IconShareFill /> {{ $t('retrospective.share') }}
                </button>
                <span v-if="copiedResult === true" class="ms-2 text-success">{{ $t('retrospective.link_copied') }}</span>
                <p v-if="player && isMe(player)" class="small text-body-secondary mt-2 mb-0">{{ $t('retrospective.share_private_note') }}</p>
            </div>

            <nav v-if="player && isMe(player)" class="d-flex justify-content-center align-items-center flex-wrap gap-3 mb-3">
                <router-link
                    v-if="previousRetrospective"
                    :to="{ name: 'player-retrospective', params: { slug: retrospective.player.slug, year: previousRetrospective.year, shareCode: previousRetrospective.shareCode } }"
                    class="btn btn-outline-secondary"
                ><IconArrowLeft /> {{ $t('retrospective.title', { year: previousRetrospective.year }) }}</router-link>
                <router-link :to="{ name: 'player-retrospectives', params: { slug: retrospective.player.slug } }">{{ $t('retrospective.all_retrospectives') }}</router-link>
                <router-link
                    v-if="nextRetrospective"
                    :to="{ name: 'player-retrospective', params: { slug: retrospective.player.slug, year: nextRetrospective.year, shareCode: nextRetrospective.shareCode } }"
                    class="btn btn-outline-secondary"
                >{{ $t('retrospective.title', { year: nextRetrospective.year }) }} <IconArrowRight /></router-link>
            </nav>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.retrospective
    max-width 960px

.retro-section
    margin-bottom 3rem

.retro-section-title
    font-size 1.6rem
    font-weight 700
    margin-bottom 1.25rem

.retro-small-caps
    letter-spacing 0.12em

.retro-bg-icon
    position absolute
    right -2rem
    bottom -2.5rem
    font-size 13rem
    opacity 0.07
    transform rotate(-12deg)
    pointer-events none

// Activity
.retro-huge
    font-size 6rem
    font-weight 800
    line-height 1

.retro-activity-list li
    padding 0.6rem 0
    border-bottom 1px solid var(--bs-border-color)

    &:last-child
        border-bottom none

.retro-activity-icon
    display inline-flex
    align-items center
    justify-content center
    flex-shrink 0
    width 2.6rem
    height 2.6rem
    border-radius 50%
    background var(--bs-secondary-bg)
    color var(--bs-primary)
    font-size 1.2rem

// Level
.retro-level
    position relative
    overflow hidden
    background var(--bs-tertiary-bg)

.retro-rating
    font-size 4.5rem
    font-weight 800
    line-height 1

@media (min-width: 768px)
    .retro-level-columns > div + div
        border-left 1px solid var(--bs-border-color)

// Activity calendar: 2 months per row on mobile, 4 on larger screens
.retro-calendar
    display grid
    grid-template-columns repeat(2, minmax(0, 1fr))
    gap 0.5rem

    @media (min-width: 768px)
        grid-template-columns repeat(4, minmax(0, 1fr))

.retro-month
    --retro-month-intensity 0
    border 1px solid var(--bs-border-color)
    background unquote('rgba(var(--bs-primary-rgb), calc(0.04 + 0.26 * var(--retro-month-intensity)))')

.text-rank-gold
    color #ffc107

.text-rank-silver
    color #adb5bd

.text-rank-bronze
    color #cd7f32

// Social
.retro-social-tile
    position relative
    overflow hidden
    border-left 0.4rem solid var(--bs-info)
    background var(--bs-info-bg-subtle)

    .retro-bg-icon
        font-size 9rem
        right -1rem
        bottom -1.5rem
        color var(--bs-info)
        opacity 0.12

// Competition
.retro-rank
    display inline-flex
    align-items center
    justify-content center
    flex-shrink 0
    width 2.2rem
    height 2.2rem
    border-radius 50%
    font-weight 700
    background var(--bs-secondary-bg)

    &.retro-rank-first
        width 3rem
        height 3rem
        font-size 1.3rem

    &.rank-gold
        background #ffc107
        color #212529

    &.rank-silver
        background #adb5bd
        color #212529

    &.rank-bronze
        background #cd7f32
        color #fff

.retro-ladder
    position relative
    overflow hidden
    border 1px solid var(--bs-warning-border-subtle)
    background linear-gradient(180deg, var(--bs-warning-bg-subtle), transparent)

    .retro-bg-icon
        color var(--bs-warning)
        opacity 0.1

.retro-ladder-reign
    gap 1rem 3rem
    max-width 32rem
    background var(--bs-body-bg)
    border 1px solid var(--bs-warning-border-subtle)

.retro-ladder-crown
    font-size 2.5rem

.retro-ladder-stats
    gap 1rem 3rem

// Game of the year
.retro-goty
    position relative
    overflow hidden
    background #16191c
    color #f8f9fa

    .retro-bg-icon
        color #ffc107
        opacity 0.12

.retro-goty-context
    color rgba(248, 249, 250, 0.6)

// Blunder
.retro-feature
    position relative
    overflow hidden
    padding 1.5rem

    .retro-blunder-icon
        font-size 10rem
        right -1.5rem
        bottom -2rem
        opacity 0.12

// Challenges
.retro-challenges
    border 2px dashed var(--bs-border-color)

.retro-challenges-list
    max-width 32rem

    li
        padding 0.5rem 0

.retro-checkbox
    flex-shrink 0
    width 1.4rem
    height 1.4rem
    border 2px solid var(--bs-secondary-color)
    border-radius 0.3rem
</style>
