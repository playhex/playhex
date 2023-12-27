<script setup lang="ts">
/* eslint-env browser */
import GameView, { BoardOrientation } from '@client/pixi-board/GameView';
import { onMounted, onUnmounted, ref } from '@vue/runtime-core';
import { PropType, toRefs } from 'vue';
import GameOverOverlay from '@client/vue/components/overlay/GameOverOverlay.vue';
import { createOverlay } from 'unoverlay-vue';
import AppOnlineStatus from './AppOnlineStatus.vue';
import AppPlayer from '@shared/app/AppPlayer';
import AppChrono from './AppChrono.vue';
import { TimeControlOptionsValues } from '@shared/app/Types';

const pixiApp = ref<HTMLElement>();

const props = defineProps({
    gameView: {
        type: GameView,
        required: true,
    },
    gameTimeControl: {
        type: Object as PropType<TimeControlOptionsValues>,
    },
    rematch: {
        type: Function,
        required: false,
    },
});

const { gameView, gameTimeControl } = toRefs(props);

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
const { rematch } = props;

gameView.value.on('endedAndWinAnimationOver', () => {
    gameOverOverlay({
        game,
        rematch,
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
                <app-chrono
                    v-if="gameTimeControl"
                    :timeControlOptions="gameTimeControl.options"
                    :playerTimeData="gameTimeControl.values.players[0]"
                ></app-chrono>
                <p class="text-player-a h4" v-for="player in [game.getPlayer(0)]" :key="player.getName()">
                    <app-online-status
                        v-if="(player instanceof AppPlayer)"
                        :playerData="player.getPlayerData()"
                    ></app-online-status>
                    <span v-else class="fst-italic">waiting…</span>
                </p>
            </div>
            <div class="player player-b mx-2">
                <app-chrono
                    v-if="gameTimeControl"
                    :timeControlOptions="gameTimeControl.options"
                    :playerTimeData="gameTimeControl.values.players[1]"
                ></app-chrono>
                <p class="text-player-b h4" v-for="player in [game.getPlayer(1)]" :key="player.getName()">
                    <app-online-status
                        v-if="(player instanceof AppPlayer)"
                        :playerData="player.getPlayerData()"
                    ></app-online-status>
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
