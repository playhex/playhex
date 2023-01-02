<script setup lang="ts">
/* eslint-env browser */
import { useRoute } from 'vue-router';
import GameView from '@client/GameView';
import useHexClient from '@client/hexClient';
import { ref } from '@vue/runtime-core';
import socket from '@client/socket';
import RemotePlayMoveController from '@client/MoveController/RemotePlayMoveController';
import AppBoard from '@client/vue/components/AppBoard.vue';
import { PlayerIndex } from '@shared/game-engine';

const route = useRoute();
const hexClient = useHexClient();
const gameView = ref<GameView>();
const { gameId } = route.params;

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

(async () => {
    let game = hexClient.gameClientSockets[gameId]?.getGame();

    if (!game) {
        const gameClientSocket = await hexClient.retrieveGameClientSocket(gameId);

        if (!gameClientSocket) {
            throw new Error('game not found');
        }

        game = gameClientSocket.getGame();
    }

    hexClient.joinRoom(socket, 'join', `games/${gameId}`);

    gameView.value = new GameView(game, new RemotePlayMoveController(gameId));
})();

const onJoin = async (playerIndex: PlayerIndex) => {
    const joined = await hexClient.joinGame(gameId, playerIndex);

    if (!joined) {
        console.error('could not join');
    }
};
</script>

<template>
    <app-board
        v-if="gameView"
        :game-view="gameView"
        :on-join="onJoin"
    ></app-board>
    <p v-else>Loading game {{ gameId }}...</p>
</template>
