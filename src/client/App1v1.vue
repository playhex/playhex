<script setup>
import { useRoute } from 'vue-router';
import { Application } from 'pixi.js';
import GameView from './GameView';
import Hex from './Hex';
import useHexClient from './hexClient';
import { onMounted, ref } from '@vue/runtime-core';
import { reactive } from 'vue';

const route = useRoute();
const hexClient = useHexClient();
const colorA = '#' + Hex.COLOR_A.toString(16);
const colorB = '#' + Hex.COLOR_B.toString(16);
const pixiApp = ref(null);

const SIZE = 11;

const {gameId} = route.params;

const game = ref(null);

const app = new Application({
    antialias: true,
    background: 0xffffff,
});

(async () => {
    game.value = hexClient.gameClientSockets[gameId]?.getGame();

    if (!game.value) {
        const gameFound = await hexClient.retrieveGameClientSocket(gameId);

        if (!gameFound) {
            throw new Error('game not found');
        }

        game.value = hexClient.gameClientSockets[gameId].game;
    }

    console.log('game loaded', game.value);

    const gameView = new GameView(game.value);
    const view = gameView.getView();

    //GameLoop.run(game.value);

    view.position = {x: Hex.RADIUS * 2, y: Hex.RADIUS * (SIZE + 1) * Math.sqrt(3) / 2};
    view.rotation = -1 * (Math.PI / 6);

    app.stage.addChild(view);
})();

onMounted(async () => {
    pixiApp.value.appendChild(app.view);
});

const join = async (playerIndex) => {
    console.log('join', playerIndex);

    const answer = await hexClient.joinGame(game.value.id, playerIndex);

    console.log('has joined:', answer);
};
</script>

<template>
    <div class="container">
        <div v-if="game" class="game-info">
            <div class="player-a">
                <p :style="{color: colorA}">{{ game.players[0].playerData.id }}</p>
                <button @click="join(0)">Join</button>
            </div>
            <div class="player-b">
                <p :style="{color: colorB}">{{ game.players[1].playerData.id }}</p>
                <button @click="join(1)">Join</button>
            </div>
        </div>
        <p v-else>Loading game data...</p>

        <div class="board" ref="pixiApp"></div>
    </div>
</template>

<style scoped>
.container {
    position: relative;
}
.game-info {
    position: relative;
    top: 0;
}

.game-info > div {
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
