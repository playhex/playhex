<script setup lang="ts">
import { PropType, computed } from 'vue';
import { format } from 'date-fns';
import { PlayerHeadToHeadStats } from '../../../shared/app/models/index.js';
import { msToDuration } from '../../../shared/app/timeControlUtils.js';
import { IconTablerSwords, IconClockHistory, IconCaretRight, IconTrophy, IconPeople } from '../icons.js';

const { headToHead } = defineProps({
    headToHead: {
        type: Object as PropType<PlayerHeadToHeadStats>,
        required: true,
    },
});

defineEmits<{
    showOurGames: [];
    challenge: [mode: 'ranked' | 'friendly'];
}>();

const winRate = computed<number>(() => headToHead.totalGames > 0
    ? Math.round(100 * headToHead.wonGames / headToHead.totalGames)
    : 0,
);

/**
 * Minimum games played together before showing a rivalry verdict,
 * below that a win rate is mostly luck and the verdict would be silly.
 */
const RIVALRY_MIN_GAMES = 4;

/**
 * Fun verdict on the rivalry, from the logged in player point of view.
 * i18n key, or null when they did not play enough games together.
 */
const rivalry = computed<null | { key: string, className: string }>(() => {
    if (headToHead.totalGames < RIVALRY_MIN_GAMES) {
        return null;
    }

    const rate = winRate.value;

    if (rate >= 90) return { key: 'rivalry.flawless', className: 'text-bg-success' };
    if (rate >= 70) return { key: 'rivalry.dominating', className: 'text-bg-success' };
    if (rate >= 56) return { key: 'rivalry.upper_hand', className: 'text-bg-success' };
    if (rate >= 45) return { key: 'rivalry.neck_and_neck', className: 'text-bg-secondary' };
    if (rate >= 31) return { key: 'rivalry.losing_ground', className: 'text-bg-danger' };
    if (rate >= 11) return { key: 'rivalry.dominated', className: 'text-bg-danger' };

    return { key: 'rivalry.nemesis', className: 'text-bg-danger' };
});

const hasGames = computed<boolean>(() => headToHead.totalGames > 0);
</script>

<template>
    <div class="card head-to-head mb-4">
        <div class="card-body">
            <h3 class="card-title h5 mb-1 text-center"><IconTablerSwords /> {{ $t('head_to_head') }}</h3>

            <p v-if="!hasGames" class="mb-0 text-center text-body-secondary">
                {{ $t('never_played_together') }}
            </p>

            <template v-if="hasGames">
                <p v-if="rivalry" class="mb-3 text-center">
                    <span class="badge rivalry-badge" :class="rivalry.className">{{ $t(rivalry.key) }}</span>
                </p>

                <div class="score mx-auto text-center">
                    <p class="mb-0 text-body-secondary">{{ $t('games_together') }}</p>
                    <p class="total-games mb-3">{{ headToHead.totalGames }}</p>

                    <div class="d-flex align-items-end mb-1">
                        <span class="lead text-success">
                            <strong>{{ headToHead.wonGames }}</strong>
                            {{ ' ' }}
                            <small>{{ $t('won_games') }}</small>
                        </span>
                        <span class="lead flex-grow-1 text-center">{{ winRate }}%</span>
                        <span class="lead text-danger">
                            <small>{{ $t('lost_games') }}</small>
                            {{ ' ' }}
                            <strong>{{ headToHead.lostGames }}</strong>
                        </span>
                    </div>

                    <div class="progress-stacked">
                        <div
                            class="progress"
                            role="progressbar"
                            :aria-label="$t('won_games')"
                            :aria-valuenow="winRate"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            :style="{ width: winRate + '%' }"
                        ><div class="progress-bar bg-success"></div></div>
                        <div
                            class="progress"
                            role="progressbar"
                            :aria-label="$t('lost_games')"
                            :aria-valuenow="100 - winRate"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            :style="{ width: (100 - winRate) + '%' }"
                        ><div class="progress-bar bg-danger"></div></div>
                    </div>
                </div>
            </template>

            <div class="challenge-btns d-flex flex-wrap justify-content-center gap-2 mt-4">
                <button
                    type="button"
                    class="btn btn-warning"
                    @click="$emit('challenge', 'ranked')"
                ><IconTrophy /> {{ $t('challenge_ranked') }}</button>

                <button
                    type="button"
                    class="btn btn-success"
                    @click="$emit('challenge', 'friendly')"
                ><IconPeople /> {{ $t('challenge_friendly') }}</button>
            </div>

            <template v-if="hasGames">
                <div class="score mx-auto text-center">
                    <div v-if="headToHead.liveGames > 0" class="mt-4">
                        <p class="mb-0 text-body-secondary">{{ $t('total_play_time') }}</p>
                        <p class="display-6 mb-0">
                            <IconClockHistory class="text-body-secondary" />
                            {{ ' ' }}
                            {{ msToDuration(1000 * headToHead.totalPlayTimeSeconds) }}
                        </p>
                        <p class="small mb-0 text-body-secondary">{{ $t('total_play_time_live_only') }}</p>
                    </div>

                    <div class="d-flex justify-content-center gap-4 mt-4">
                        <p class="small mb-0 text-body-secondary">
                            {{ $t('first_game_together') }}
                            <br />
                            <router-link
                                v-if="headToHead.firstGamePublicId && headToHead.firstGameEndedAt"
                                :to="{ name: 'online-game', params: { gameId: headToHead.firstGamePublicId } }"
                            >{{ format(headToHead.firstGameEndedAt, 'd MMM yyyy') }}</router-link>
                        </p>
                        <p class="small mb-0 text-body-secondary">
                            {{ $t('last_game_together') }}
                            <br />
                            <router-link
                                v-if="headToHead.lastGamePublicId && headToHead.lastGameEndedAt"
                                :to="{ name: 'online-game', params: { gameId: headToHead.lastGamePublicId } }"
                            >{{ format(headToHead.lastGameEndedAt, 'd MMM yyyy') }}</router-link>
                        </p>
                    </div>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-primary mt-4"
                        @click="$emit('showOurGames')"
                    >{{ $t('see_our_games') }} <IconCaretRight /></button>
                </div>
            </template>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.head-to-head
    .score
        max-width 30rem

    .progress-stacked
        height 1.25rem

        .progress
            height 100%

    .rivalry-badge
        font-size 0.8rem
        letter-spacing 0.02em

    .total-games
        font-size calc(1.6rem + 0.6vw)
        line-height 1.1

    .display-6
        font-size calc(1.275rem + 0.3vw)
</style>
