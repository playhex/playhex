<script setup lang="ts">
/* eslint-env browser */
import GameView, { BoardOrientation } from '../../pixi-board/GameView';
import { onMounted, onUnmounted, ref } from '@vue/runtime-core';
import { PropType, toRefs } from 'vue';
import GameFinishedOverlay from './overlay/GameFinishedOverlay.vue';
import { createOverlay } from 'unoverlay-vue';
import AppChrono from './AppChrono.vue';
import AppPseudoWithOnlineStatus from './AppPseudoWithOnlineStatus.vue';
import { PlayerData, TimeControlOptionsValues } from '../../../shared/app/Types';

const pixiApp = ref<HTMLElement>();

const props = defineProps({
    players: {
        type: Array as PropType<null | PlayerData[]>,
    },
    timeControl: {
        type: Object as PropType<TimeControlOptionsValues>,
    },
    gameView: {
        type: GameView,
        required: true,
    },
    rematch: {
        type: Function,
        required: false,
    },
});

const { players, gameView } = props;
const { timeControl } = toRefs(props);

/*
 * Add piwi view
 */
const game = gameView.getGame();

if (!gameView || !game) {
    throw new Error('gameView is required');
}

onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    if (!gameView) {
        throw new Error('gameView has no value');
    }

    pixiApp.value.appendChild(gameView.getView() as unknown as Node);
});

onUnmounted(() => {
    gameView.destroy();
});

/*
 * Orientation auto update on screen size change
 */
let orientation = ref<BoardOrientation>(gameView.getOrientation());
const updateOrientation = () => orientation.value = gameView.getOrientation();
window.addEventListener('resizeDebounced', updateOrientation);

onUnmounted(() => window.removeEventListener('resizeDebounced', updateOrientation));

/*
 * Game end: win popin
 */
const gameFinishedOverlay = createOverlay(GameFinishedOverlay);
const { rematch } = props;

gameView.on('endedAndWinAnimationOver', () => {
    gameFinishedOverlay({
        game,
        players,
        rematch,
    });
});

onUnmounted(() => gameView.removeAllListeners('endedAndWinAnimationOver'));
</script>

<template>
    <div class="app-board">
        <div class="board-container">
            <div ref="pixiApp"></div>
        </div>

        <div v-if="game" :class="['game-info-overlay', `orientation-${orientation}`]">
            <div class="player player-a mx-2">
                <app-chrono
                    v-if="timeControl"
                    :timeControlOptions="timeControl.options"
                    :playerTimeData="timeControl.values.players[0]"
                />
                <p class="h4" v-if="players">
                    <app-pseudo-with-online-status
                        v-if="players[0]"
                        :playerData="players[0]"
                        classes="text-danger"
                    />
                    <span v-else class="fst-italic">waiting…</span>
                </p>
            </div>
            <div class="player player-b mx-2">
                <app-chrono
                    v-if="timeControl"
                    :timeControlOptions="timeControl.options"
                    :playerTimeData="timeControl.values.players[1]"
                />
                <p class="h4" v-if="players">
                    <app-pseudo-with-online-status
                        v-if="players[1]"
                        :playerData="players[1]"
                        classes="text-primary"
                    />
                    <span v-else class="fst-italic">waiting…</span>
                </p>
            </div>
        </div>
        <p v-else>Initialize game…</p>
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
