<script setup lang="ts">
/* eslint-env browser */
import { useRoute, useRouter } from 'vue-router';
import GameView from '@client/GameView';
import useHexClient from '@client/hexClient';
import { ref } from '@vue/runtime-core';
import socket from '@client/socket';
import RemotePlayMoveController from '@client/MoveController/RemotePlayMoveController';
import AppBoard from '@client/vue/components/AppBoard.vue';
import { playerCanJoinGame } from '@shared/app/GameUtils';
import { storeToRefs } from 'pinia';

const { loggedInUser } = storeToRefs(useHexClient());
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

const canJoin = (): boolean => {
    const game = gameView.value?.getGame();
    const loggedInUserValue = loggedInUser.value;

    if (!game) {
        return false;
    }

    if (null === loggedInUserValue) {
        return false;
    }

    return playerCanJoinGame(game, loggedInUserValue.id);
};

const join = async () => {
    const result = await hexClient.joinGame(gameId);

    if (true !== result) {
        console.error('could not join:', result);
    }
};
</script>

<template>
    <div class="position-relative">
        <app-board
            v-if="gameView"
            :game-view="gameView"
        ></app-board>
        <p v-else>Loading game {{ gameId }}...</p>

        <div v-if="canJoin()" class="position-absolute w-100 join-button-container">
            <div class="d-flex justify-content-center">
                <button class="btn btn-lg btn-success" @click="join()">Accept</button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="stylus">
.join-button-container
    top 0
</style>
