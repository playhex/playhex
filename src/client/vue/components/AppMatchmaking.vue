<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { formatDistanceStrict } from 'date-fns';
import useMatchmakingStore from '../../stores/matchmakingStore.js';
import useAuthStore from '../../stores/authStore.js';
import { defineOverlay } from '@overlastic/vue';
import { IconCheck, IconHeartFill, IconInfoCircle, IconTrophy, IconXLg } from '../icons.js';
import { apiGetMatchmakingStats } from '../../apiClient.js';
import MatchmakingInfoOverlay from './overlay/MatchmakingInfoOverlay.vue';
import {
    getBoardsizeChoice,
    getMatchmakingTimeControl,
    getRushHour,
    isValidMatchmakingPreferences,
    matchmakingBoardsizes,
    nextMatchmakingChoice,
    type MatchmakingChoice,
} from '../../../shared/app/matchmaking/matchmakingRules.js';

const matchmakingStore = useMatchmakingStore();
const { status, searching, entering, preferences } = storeToRefs(matchmakingStore);
const { loggedInPlayer } = storeToRefs(useAuthStore());

const valid = computed(() => isValidMatchmakingPreferences(preferences.value));

const setChoice = (boardsize: number, choice: MatchmakingChoice): void => {
    if (getBoardsizeChoice(preferences.value, boardsize) === choice) {
        return;
    }

    const boardsizes = { ...preferences.value.boardsizes };

    if (choice === 'no') {
        delete boardsizes[boardsize];
    } else {
        boardsizes[boardsize] = choice;
    }

    preferences.value = { boardsizes };
    matchmakingStore.onPreferencesChanged();
};

/*
 * Paint: press on a boardsize to cycle its choice,
 * keep pressed and slide over other boardsizes to copy this choice.
 */
const paintChoice = ref<null | MatchmakingChoice>(null);

const onBoardsizePointerDown = (event: PointerEvent, boardsize: number): void => {
    if (event.button !== 0) {
        return;
    }

    // Touch implicitly captures pointer, release it to receive moves over other buttons
    (event.target as Element).releasePointerCapture?.(event.pointerId);

    const next = nextMatchmakingChoice(getBoardsizeChoice(preferences.value, boardsize));

    paintChoice.value = next;
    setChoice(boardsize, next);
};

const onBoardsizesPointerMove = (event: PointerEvent): void => {
    if (paintChoice.value === null) {
        return;
    }

    const button = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-boardsize]');

    if (button) {
        setChoice(Number(button.dataset.boardsize), paintChoice.value);
    }
};

const stopPaint = (): void => {
    paintChoice.value = null;
};

window.addEventListener('pointerup', stopPaint);
window.addEventListener('pointercancel', stopPaint);

onUnmounted(() => {
    window.removeEventListener('pointerup', stopPaint);
    window.removeEventListener('pointercancel', stopPaint);
});

/**
 * Keyboard only (click with detail === 0), pointer is handled on pointerdown
 */
const onBoardsizeClick = (event: MouseEvent, boardsize: number): void => {
    if (event.detail !== 0) {
        return;
    }

    setChoice(boardsize, nextMatchmakingChoice(getBoardsizeChoice(preferences.value, boardsize)));
};

const openInfoOverlay = defineOverlay(MatchmakingInfoOverlay);

/**
 * Time controls by boardsize range, e.g 11-15: 5+5, 16-19: 7+7
 */
const timeControlRanges = computed(() => {
    const ranges: { min: number, max: number, minutes: number, seconds: number }[] = [];

    for (const boardsize of matchmakingBoardsizes) {
        const { options } = getMatchmakingTimeControl(boardsize);
        const minutes = options.initialTime / 60_000;
        const seconds = 'timeIncrement' in options ? (options.timeIncrement ?? 0) / 1000 : 0;
        const last = ranges[ranges.length - 1];

        if (last && last.minutes === minutes && last.seconds === seconds) {
            last.max = boardsize;
        } else {
            ranges.push({ min: boardsize, max: boardsize, minutes, seconds });
        }
    }

    return ranges;
});

const choiceClass = (choice: MatchmakingChoice): string => {
    switch (choice) {
        case 'yes': return 'btn-success';
        case 'heart': return 'btn-danger';
        case 'no': return 'btn-outline-secondary';
    }
};

const onPlayClick = async (): Promise<void> => {
    if (searching.value) {
        await matchmakingStore.leave();
        return;
    }

    await matchmakingStore.enter();
};

/*
 * Clock: elapsed search time, rush hour
 */
const now = ref(new Date());
const clock = setInterval(() => now.value = new Date(), 1000);

onUnmounted(() => clearInterval(clock));

const elapsed = computed((): string => {
    if (status.value === null) {
        return '';
    }

    const seconds = Math.max(0, Math.floor((now.value.getTime() - status.value.enteredAt) / 1000));

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
});

/**
 * Recomputed every minute only
 */
const rushHour = computed(() => {
    const minute = new Date(now.value);
    minute.setSeconds(0, 0);

    return getRushHour(minute);
});

const formatHour = (date: Date): string => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/*
 * My stats
 */
const stats = ref<null | { gamesCount: number, streak: number }>(null);

watch(loggedInPlayer, async player => {
    stats.value = null;

    if (player === null) {
        return;
    }

    try {
        stats.value = await apiGetMatchmakingStats(player.publicId);
    } catch {
        // noop, stats are optional
    }
}, { immediate: true });
</script>

<template>
    <section id="matchmaking" class="mb-4">
        <h2>{{ $t('matchmaking.title') }}</h2>

        <div class="row g-3">
            <div class="col-12 col-sm-4 col-lg-3">
                <button
                    type="button"
                    class="btn w-100 play-button"
                    :class="searching ? 'btn-secondary' : 'btn-warning'"
                    :disabled="entering || (!searching && !valid)"
                    @click="onPlayClick()"
                >
                    <template v-if="searching">
                        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                        {{ $t('matchmaking.searching') }}
                        <br>
                        <small>{{ elapsed }} · {{ $t('matchmaking.cancel') }}</small>
                    </template>
                    <template v-else>
                        <IconTrophy class="fs-3" />
                        <br>
                        {{ $t('matchmaking.play') }}
                    </template>
                </button>

                <p v-if="stats && stats.gamesCount > 0" class="small text-body-secondary text-center mt-1 mb-0">
                    {{ $t('matchmaking.games_count', { count: stats.gamesCount }) }}
                    <template v-if="stats.streak > 0">
                        · <span :title="$t('matchmaking.info.streak')">{{ $t('matchmaking.streak', { count: stats.streak }) }}</span>
                    </template>
                </p>
            </div>

            <div class="col">
                <p class="small mb-1">
                    {{ $t('matchmaking.boardsizes') }}
                    <button
                        type="button"
                        class="btn btn-link btn-sm p-0 ms-1 align-baseline text-body-secondary"
                        :title="$t('matchmaking.how_it_works')"
                        :aria-label="$t('matchmaking.how_it_works')"
                        @click="openInfoOverlay({})"
                    >
                        <IconInfoCircle />
                    </button>
                </p>

                <div
                    class="btn-group flex-wrap boardsizes mb-1"
                    role="group"
                    :aria-label="$t('matchmaking.boardsizes')"
                    @pointermove="onBoardsizesPointerMove"
                >
                    <button
                        v-for="boardsize in matchmakingBoardsizes"
                        :key="boardsize"
                        type="button"
                        class="btn btn-sm boardsize"
                        :class="choiceClass(getBoardsizeChoice(preferences, boardsize))"
                        :data-boardsize="boardsize"
                        :title="$t('matchmaking.choice_' + getBoardsizeChoice(preferences, boardsize), { size: boardsize })"
                        :aria-label="$t('matchmaking.choice_' + getBoardsizeChoice(preferences, boardsize), { size: boardsize })"
                        @pointerdown="onBoardsizePointerDown($event, boardsize)"
                        @click="onBoardsizeClick($event, boardsize)"
                    >
                        {{ boardsize }}
                        <br>
                        <IconHeartFill v-if="getBoardsizeChoice(preferences, boardsize) === 'heart'" />
                        <IconCheck v-else-if="getBoardsizeChoice(preferences, boardsize) === 'yes'" />
                        <IconXLg v-else class="choice-no" />
                    </button>
                </div>

                <p v-if="!valid" class="small text-danger mb-1">{{ $t('matchmaking.at_least_one_boardsize') }}</p>

                <p class="small text-body-secondary mb-1">
                    {{ $t('matchmaking.ranked') }}
                    <template v-for="(range, i) in timeControlRanges" :key="range.min">
                        <span class="mx-2">·</span>
                        <template v-if="i === 0">{{ range.minutes }}min + {{ range.seconds }}s</template>
                        <template v-else>({{ '≥' }} {{ range.min }}×{{ range.min }} : {{ range.minutes }}min + {{ range.seconds }}s)</template>
                    </template>
                </p>

                <p class="small mb-0">
                    <template v-if="rushHour.ongoing">
                        <span class="rush-hour-dot bg-success"></span>
                        {{ $t('matchmaking.rush_hour_now', { end: formatHour(rushHour.end) }) }}
                    </template>
                    <span v-else class="text-body-secondary">
                        {{ $t('matchmaking.rush_hour_next', {
                            start: formatHour(rushHour.start),
                            end: formatHour(rushHour.end),
                            distance: formatDistanceStrict(rushHour.start, now, { addSuffix: true }),
                        }) }}
                    </span>
                </p>
            </div>
        </div>
    </section>
</template>

<style lang="stylus" scoped>
.play-button
    min-height 6em

    @media (min-width: 992px)
        min-height 7em

.boardsizes
    touch-action none
    user-select none

.boardsize
    min-width 2.75em
    line-height 1.2
    transition none

    // No hover/active color change, keep the choice color
    --bs-btn-hover-bg var(--bs-btn-bg)
    --bs-btn-hover-color var(--bs-btn-color)
    --bs-btn-hover-border-color var(--bs-btn-border-color)
    --bs-btn-active-bg var(--bs-btn-bg)
    --bs-btn-active-color var(--bs-btn-color)
    --bs-btn-active-border-color var(--bs-btn-border-color)

.choice-no
    opacity .35

.rush-hour-dot
    display inline-block
    width .6em
    height .6em
    border-radius 50%
    vertical-align middle
</style>
