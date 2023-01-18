<script setup lang="ts">
/* eslint-env browser */
import { useRoute, useRouter } from 'vue-router';
import GameView from '@client/GameView';
import useHexClient from '@client/hexClient';
import { ref } from '@vue/runtime-core';
import socket from '@client/socket';
import RemotePlayMoveController from '@client/MoveController/RemotePlayMoveController';
import AppBoard from '@client/vue/components/AppBoard.vue';
import { PlayerIndex } from '@shared/game-engine';

const route = useRoute();
const router = useRouter();
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
            console.error(`Game ${gameId} no longer exists.`);
            router.push({name: 'home'});
            return;
        }

        game = gameClientSocket.getGame();
    }

    hexClient.joinRoom(socket, 'join', `games/${gameId}`);

    gameView.value = new GameView(game, new RemotePlayMoveController());
})();

const onJoin = async (playerIndex: PlayerIndex) => {
    const result = await hexClient.joinGame(gameId, playerIndex);

    if (true !== result) {
        console.error('could not join:', result);
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
