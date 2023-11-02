<script setup lang="ts">
/* eslint-env browser */
import { useRoute, useRouter } from 'vue-router';
import GameView from '@client/pixi-board/GameView';
import useHexClient from '@client/hexClient';
import { ref } from '@vue/runtime-core';
import socket from '@client/socket';
import AppBoard from '@client/vue/components/AppBoard.vue';
import ConfirmationOverlay from '@client/vue/components/ConfirmationOverlay.vue';
import { playerCanJoinGame } from '@shared/app/GameUtils';
import { storeToRefs } from 'pinia';
import GameClientSocket from 'GameClientSocket';
import { Game } from '@shared/game-engine';
import ClientPlayer from 'ClientPlayer';
import { createOverlay } from 'unoverlay-vue';

const { loggedInUser } = storeToRefs(useHexClient());
const route = useRoute();
const router = useRouter();
const hexClient = useHexClient();
const gameView = ref<GameView>();
let gameClientSocket = ref<null | GameClientSocket>(null);
let game: Game;
let localPlayer = ref<null | ClientPlayer>(null);
const { gameId } = route.params;

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

(async () => {
    gameClientSocket.value = await hexClient.retrieveGameClientSocket(gameId);

    if (!gameClientSocket.value) {
        console.error(`Game ${gameId} no longer exists.`);
        router.push({ name: 'home' });
        return;
    }

    game = gameClientSocket.value.getGame();
    localPlayer.value = gameClientSocket.value.getLocalPlayer();

    hexClient.joinRoom(socket, 'join', `games/${gameId}`);

    gameView.value = new GameView(game);

    gameView.value.on('hexClicked', move => {
        try {
            gameClientSocket.value?.getLocalPlayer()?.move(move);
        } catch (e) {
            console.log('Move not played: ' + e);
        }
    });
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

const confirmationOverlay = createOverlay(ConfirmationOverlay);

const resign = async (): Promise<void> => {
    if (null === localPlayer.value) {
        return;
    }

    try {
        await confirmationOverlay({
            title: 'Resign game',
            message: 'Are you sure you want to resign game?',
            confirmLabel: 'Yes, resign',
            confirmClass: 'btn-danger',
            cancelLabel: 'No, continue playing',
            cancelClass: 'btn-outline-primary',
        });
        localPlayer.value.resign();
    } catch (e) {
        // resignation cancelled
    }
};
</script>

<template>
    <div class="position-relative">
        <app-board
            v-if="gameView"
            :game-view="gameView"
            :time-control-values="gameClientSocket?.getTimeControl()"
        ></app-board>
        <p v-else>Loading game {{ gameId }}...</p>

        <div v-if="canJoin()" class="position-absolute w-100 join-button-container">
            <div class="d-flex justify-content-center">
                <button class="btn btn-lg btn-success" @click="join()">Accept</button>
            </div>
        </div>
    </div>

    <div class="menu-game">
        <div class="container-fluid">
            <div class="d-flex">
                <a v-if="localPlayer" href="#" @click="e => { e.preventDefault(); resign() }">Resign</a>
            </div>
        </div>
    </div>
</template>

<style scoped lang="stylus">
.join-button-container
    top 0
</style>
