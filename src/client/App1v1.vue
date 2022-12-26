<script setup>
import { useRoute } from 'vue-router';
import { Application } from 'pixi.js';
import GameView from './GameView';
import Hex from './Hex';
import useHexClient from './hexClient';
import { onMounted, ref } from '@vue/runtime-core';
import socket from './socket';
import { IllegalMove } from '../shared/game-engine';
import FrontPlayer from './FrontPlayer';

const route = useRoute();
const hexClient = useHexClient();
const colorA = '#' + Hex.COLOR_A.toString(16);
const colorB = '#' + Hex.COLOR_B.toString(16);
const pixiApp = ref(null);

const {gameId} = route.params;

const game = ref(null);

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

    const gameView = new GameView(game.value, (game, move) => {
        const currentPlayer = game.getCurrentPlayer();

        try {
            if (
                !(currentPlayer instanceof FrontPlayer)
                || !currentPlayer.interactive
            ) {
                throw new IllegalMove('not your turn');
            }

            game.checkMove(move);

            //game.setCell(move, game.getCurrentPlayerIndex());

            hexClient.move(gameId, move);
        } catch (e) {
            if (e instanceof IllegalMove) {
                console.error(e.message);
            } else {
                throw e;
            }
        }
    });

    const view = gameView.getView();

    view.position = {x: Hex.RADIUS * 2, y: Hex.RADIUS * (game.value.getSize() + 1) * Math.sqrt(3) / 2};
    view.rotation = -1 * (Math.PI / 6);

    app.stage.addChild(view);
})();

onMounted(async () => {
    pixiApp.value.appendChild(app.view);
});

const joinGame = async (playerIndex) => {
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
                <p :style="{color: colorA}">{{ game.players[0].toData().id }}</p>
                <button @click="joinGame(0)">Join</button>
            </div>
            <div class="player-b">
                <p :style="{color: colorB}">{{ game.players[1].toData().id }}</p>
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
