<script setup>
import { Application } from 'pixi.js';
import GameView from './GameView';
import Hex from './Hex';
import FrontPlayer from './FrontPlayer';
import { Game, GameLoop } from '@shared/game-engine';
import { onMounted, ref } from '@vue/runtime-core';
import { localPlay } from './onClick';

let app = null;
const game = ref(null);
const colorA = '#' + Hex.COLOR_A.toString(16);
const colorB = '#' + Hex.COLOR_B.toString(16);
const pixiApp = ref(null);

(async () => {
    game.value = new Game([
        new FrontPlayer(true, {id: 'Player'}),
        new FrontPlayer(true, {id: 'Player'}),
    ]);
    const gameView = new GameView(game.value, localPlay);
    const view = gameView.getView();

    GameLoop.run(game.value);

    view.position = {x: Hex.RADIUS * 2, y: Hex.RADIUS * (game.value.getSize() + 1) * Math.sqrt(3) / 2};
    view.rotation = -1 * (Math.PI / 6);

    app = new Application({
        antialias: true,
        background: 0xffffff,
    });

    app.stage.addChild(view);

    console.log('init done');
})();

onMounted(() => {
    console.log('onMounted', app);
    pixiApp.value.appendChild(app.view);
});
</script>

<template>
    <div class="container">
        <div v-if="game" class="game-info">
            <div class="player-a">
                <p :style="{color: colorA}">{{ game.players[0].toData().id }}</p>
            </div>
            <div class="player-b">
                <p :style="{color: colorB}">{{ game.players[1].toData().id }}</p>
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
