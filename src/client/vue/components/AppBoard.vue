<script setup lang="ts">
/* eslint-env browser */
import GameView, { BoardOrientation } from '@client/pixi-board/GameView';
import { onMounted, onUnmounted, ref } from '@vue/runtime-core';
import { PropType, toRefs } from 'vue';
import GameOverOverlay from '@client/vue/components/GameOverOverlay.vue';
import { createOverlay } from 'unoverlay-vue';
import { TimeValue } from '@shared/time-control/types';
import { TimeControlValues } from '@shared/time-control/TimeControlInterface';
import { format } from 'date-fns';

const pixiApp = ref<HTMLElement>();

const props = defineProps({
    gameView: {
        type: GameView,
        required: true,
    },
    timeControlValues: {
        type: Object as PropType<TimeControlValues>,
    },
});

/*
 * Chrono
 */
const { gameView, timeControlValues } = toRefs(props);

type Chrono = {
    time: string;
    ms?: string;
};

const toChrono = (timeValue: TimeValue): Chrono => {
    let seconds = timeValue instanceof Date
        ? (timeValue.getTime() - new Date().getTime()) / 1000
        : timeValue
    ;

    const chrono: Chrono = {
        time: format(seconds * 1000, 'm:ss'),
    };

    if (seconds < 10) {
        chrono.ms = format(seconds * 1000, '.S');
    }

    return chrono;
};

const chronoPlayerA = ref<Chrono>({ time: '…' });
const chronoPlayerB = ref<Chrono>({ time: '…' });

if (timeControlValues?.value) {
    const chronoThread = setInterval(() => {
        if (!timeControlValues.value) {
            return;
        }

        chronoPlayerA.value = toChrono(timeControlValues.value.players[0].totalRemainingTime);
        chronoPlayerB.value = toChrono(timeControlValues.value.players[1].totalRemainingTime);
    }, 50);

    onUnmounted(() => clearInterval(chronoThread));
}

/*
 * Add piwi view
 */
const game = gameView?.value?.getGame();

if (!gameView || !game) {
    throw new Error('gameView is required');
}

onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    if (!gameView.value) {
        throw new Error('gameView has no value');
    }

    pixiApp.value.appendChild(gameView.value.getView() as unknown as Node);
});

onUnmounted(() => {
    gameView.value.destroy();
});

/*
 * Orientation auto update on screen size change
 */
let orientation = ref<BoardOrientation>(gameView?.value?.getOrientation());
const updateOrientation = () => orientation.value = gameView?.value?.getOrientation();
window.addEventListener('resizeDebounced', updateOrientation);

onUnmounted(() => window.removeEventListener('resizeDebounced', updateOrientation));

/*
 * Game end: win popin
 */
const gameOverOverlay = createOverlay(GameOverOverlay);

gameView.value.on('endedAndWinAnimationOver', async winnerPlayerIndex => {
    await gameOverOverlay({
        winner: game.getPlayer(winnerPlayerIndex),
    });
});

onUnmounted(() => gameView.value.removeAllListeners('endedAndWinAnimationOver'));
</script>

<template>
    <div class="app-board">
        <div class="board-container">
            <div ref="pixiApp"></div>
        </div>

        <div v-if="game" :class="['game-info-overlay', `orientation-${orientation}`]">
            <div class="player player-a mx-2">
                <p v-if="timeControlValues">
                    <span class="chrono-time">{{ chronoPlayerA.time }}</span>
                    <span v-if="chronoPlayerA.ms">{{  chronoPlayerA.ms }}</span>
                </p>
                <h4 class="text-player-a">{{ game.getPlayer(0).getName() }}</h4>
            </div>
            <div class="player player-b mx-2">
                <p v-if="timeControlValues">
                    <span class="chrono-time">{{ chronoPlayerB.time }}</span>
                    <span v-if="chronoPlayerB.ms">{{  chronoPlayerB.ms }}</span>
                </p>
                <h4 class="text-player-b">{{ game.getPlayer(1).getName() }}</h4>
            </div>
        </div>
        <p v-else>Initialize game...</p>
    </div>
</template>

<style scoped lang="stylus">
.app-board
    position relative

.board-container
    display flex
    justify-content center

.player
    position absolute
    height auto
    max-width 35%

    p
        margin-top 0

.chrono-time
    font-size 2em

.orientation-vertical_bias_right_hand
    .player-a
        left 0
        top 0
    .player-b
        right 0
        bottom 0

.orientation-vertical_bias_left_hand
    .player-a
        right 0
        top 0
    .player-b
        left 0
        bottom 0

.orientation-horizontal
    .player-a
        left 0
        top 0
    .player-b
        right 0
        top 0

.orientation-horizontal_bias
    .player-a
        left 0
        bottom 0
    .player-b
        right 0
        top 0

.orientation-vertical
    .player-a
        left 0
        top 0
    .player-b
        right 0
        top 0
</style>
