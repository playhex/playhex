<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/GameView';
import Hex from '@client/Hex';
import FrontPlayer from '@client/FrontPlayer';
import { Game, GameLoop } from '@shared/game-engine';
import { onMounted, ref } from '@vue/runtime-core';
import LocalPlayMoveController from '@client/MoveController/LocalPlayMoveController';

const game = new Game([
    new FrontPlayer(true, { id: 'Player' }),
    new FrontPlayer(true, { id: 'Player' }),
]);

const colorA = '#' + Hex.COLOR_A.toString(16);
const colorB = '#' + Hex.COLOR_B.toString(16);
const pixiApp = ref<HTMLElement>();

const gameView = new GameView(game, new LocalPlayMoveController());

GameLoop.run(game);

onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    pixiApp.value.appendChild(gameView.getView() as unknown as Node);
});
</script>

<template>
    <div class="container">
        <div v-if="game" class="game-info">
            <div class="player-a">
                <p :style="{ color: colorA }">{{ game.getPlayer(0).toData().id }}</p>
            </div>
            <div class="player-b">
                <p :style="{ color: colorB }">{{ game.getPlayer(1).toData().id }}</p>
            </div>
        </div>
        <p v-else>Initialize game...</p>

        <div class="board" ref="pixiApp"></div>
    </div>
</template>

<style scoped>
.container {
    position: relative;
}

.player {
    position: absolute;
    top: 0;
}

.player-a {
    left: 0;
}

.player-b {
    right: 0;
    text-align: right;
}
</style>
