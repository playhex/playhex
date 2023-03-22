<script setup lang="ts">
/* eslint-env browser */
import GameView, { BoardOrientation } from '@client/pixi-board/GameView';
import { onMounted, onUnmounted, ref } from '@vue/runtime-core';
import { toRefs } from 'vue';
import GameOverOverlay from '@client/vue/components/GameOverOverlay.vue';
import { createOverlay } from 'unoverlay-vue';

const pixiApp = ref<HTMLElement>();

const props = defineProps({
    gameView: {
        type: GameView,
        required: true,
    },
});

const { gameView } = toRefs(props);
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

let orientation = ref<BoardOrientation>(gameView?.value?.getOrientation());
window.addEventListener('resizeDebounced', () => orientation.value = gameView?.value?.getOrientation());

const gameOverOverlay = createOverlay(GameOverOverlay);

gameView.value.on('endedAndWinAnimationOver', async winnerPlayerIndex => {
    await gameOverOverlay({
        winner: game.getPlayer(winnerPlayerIndex),
    });
});
</script>

<template>
    <div class="app-board">
        <div class="board-container">
            <div ref="pixiApp"></div>
        </div>

        <div v-if="game" :class="['game-info-overlay', `orientation-${orientation}`]">
            <div class="player player-a mx-2">
                <h4 class="text-player-a">{{ game.getPlayer(0).getName() }}</h4>
            </div>
            <div class="player player-b mx-2">
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
