<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Application } from 'pixi.js';
import GameView from '@client/GameView';
import Hex from '@client/Hex';
import useHexClient from '@client/hexClient';
import { onMounted, ref } from '@vue/runtime-core';
import socket from '@client/socket';
import { Game, PlayerIndex } from '@shared/game-engine';
import RemotePlayMoveController from '@client/MoveController/RemotePlayMoveController';

const route = useRoute();
const hexClient = useHexClient();
const colorA = '#' + Hex.COLOR_A.toString(16);
const colorB = '#' + Hex.COLOR_B.toString(16);
const pixiApp = ref<HTMLElement>();

const { gameId } = route.params;

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

const game = ref<Game>();

const app = new Application({
    antialias: true,
    background: 0xffffff,
});

(async () => {
    game.value = hexClient.gameClientSockets[gameId]?.getGame();

    if (!game.value) {
        const gameClientSocket = await hexClient.retrieveGameClientSocket(gameId);

        if (!gameClientSocket) {
            throw new Error('game not found');
        }

        game.value = gameClientSocket.getGame();
    }

    hexClient.joinRoom(socket, 'join', `games/${gameId}`);

    const gameView = new GameView(game.value, new RemotePlayMoveController(gameId, hexClient));

    const view = gameView.getView();

    view.position = { x: Hex.RADIUS * 2, y: Hex.RADIUS * (game.value.getSize() + 1) * Math.sqrt(3) / 2 };
    view.rotation = -1 * (Math.PI / 6);

    app.stage.addChild(view);
})();

onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    pixiApp.value.appendChild(app.view as unknown as Node);
});

const joinGame = async (playerIndex: PlayerIndex) => {
    const joined = await hexClient.joinGame(gameId, playerIndex);

    if (!joined) {
        console.error('could not join');
    }
};
</script>

<template>
    <div class="container">
        <div v-if="game" class="game-info">
            <div class="player-a">
                <p :style="{ color: colorA }">{{ game.getPlayer(0).toData().id }}</p>
                <button @click="joinGame(0)">Join</button>
            </div>
            <div class="player-b">
                <p :style="{ color: colorB }">{{ game.getPlayer(1).toData().id }}</p>
                <button @click="joinGame(1)">Join</button>
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

.game-info>div {
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
