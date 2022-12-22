<script setup>
import { Application } from 'pixi.js';
import GameView from './GameView';
import Hex from './Hex';
import FrontPlayer from './FrontPlayer';
import { Game, RandomAIPlayer, GameLoop } from '@shared/game-engine';
import { onMounted, onUnmounted, ref } from '@vue/runtime-core';

let errorMessage = '';
let app = null;
const colorA = '#' + Hex.COLOR_A.toString(16);
const colorB = '#' + Hex.COLOR_B.toString(16);
const pixiApp = ref(null);

onMounted(() => {
    const game = new Game([
        new FrontPlayer(true),
        new RandomAIPlayer(),
        //new FrontPlayer(),
    ]);
    const gameView = new GameView(game);
    const view = gameView.getView();

    GameLoop.run(game);

    view.position = {x: Hex.RADIUS * 2, y: Hex.RADIUS * (game.getSize() + 1) * Math.sqrt(3) / 2};
    view.rotation = -1 * (Math.PI / 6);

    const app = new Application({
        antialias: true,
        background: 0xffffff,
    });

    app.stage.addChild(view);

    pixiApp.value.appendChild(app.view);
});

onUnmounted(() => {
    if (null === app) {
        return;
    }

    app.destroy(true);
    app = null;
});
</script>

<template>
    <div class="container">
        <div class="board" ref="pixiApp"></div>
        <div class="player player-a">
            <p :style="{color: colorA}">Player</p>
        </div>
        <div class="player player-b">
            <p :style="{color: colorB}">AI</p>
        </div>
        <div class="board-info">
            <p ng-if="errorMessage">{{ errorMessage }}</p>
        </div>
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
.board-info {
    position: absolute;
    bottom: 0;
    left: 0;
}
</style>
