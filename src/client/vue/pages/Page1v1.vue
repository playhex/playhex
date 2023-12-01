<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/pixi-board/GameView';
import useLobbyStore from '@client/stores/lobbyStore';
import { ref } from '@vue/runtime-core';
import AppBoard from '@client/vue/components/AppBoard.vue';
import ConfirmationOverlay from '@client/vue/components/ConfirmationOverlay.vue';
import HostedGameClient from 'HostedGameClient';
import { createOverlay } from 'unoverlay-vue';
import { onUnmounted } from 'vue';
import useSocketStore from '@client/stores/socketStore';
import useAuthStore from '@client/stores/authStore';
import AppPlayer from '@shared/app/AppPlayer';
import { useRoute, useRouter } from 'vue-router';

const { gameId } = useRoute().params;

let hostedGameClient = ref<null | HostedGameClient>(null);

let gameView: null | GameView = null; // Cannot be a ref() because crash when toggle coords and hover board
const gameViewLoaded = ref(0);

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

const lobbyStore = useLobbyStore();
const router = useRouter();

/*
 * Join/leave game room
 */
useSocketStore().joinGameRoom(gameId);
onUnmounted(() => useSocketStore().leaveGameRoom(gameId));

const getLocalAppPlayer = (): null | AppPlayer => {
    const { loggedInUser } = useAuthStore();

    if (null === loggedInUser || !hostedGameClient.value) {
        return null;
    }

    return hostedGameClient.value.getLocalAppPlayer(loggedInUser);
};

const listenHexClick = () => {
    if (null === gameView) {
        throw new Error('no game view');
    }

    gameView.on('hexClicked', move => {
        try {
            // Must get local player again in case player joined after (click "Watch", then "Join")
            const localAppPlayer = getLocalAppPlayer();

            if (!localAppPlayer) {
                return;
            }

            localAppPlayer.move(move);
        } catch (e) {
            console.log('Move not played: ' + e);
        }
    });
};

const initGameView = () => {
    if (!hostedGameClient.value) {
        throw new Error('Cannot init game view now, no hostedGameClient');
    }

    const game = hostedGameClient.value.loadGame();

    gameView = new GameView(game);

    if (game.isStarted()) {
        listenHexClick();
    } else {
        game.on('started', () => listenHexClick());
    }
};

/*
 * Load game
 */
(async () => {
    hostedGameClient.value = await lobbyStore.retrieveHostedGameClient(gameId, true);

    if (!hostedGameClient.value) {
        router.push({ name: 'home' });
        return;
    }

    initGameView();
})();

const canJoin = (): boolean => {
    const hostedGameData = hostedGameClient.value?.getHostedGameData();
    const { loggedInUser } = useAuthStore();

    if (!hostedGameData || !loggedInUser) {
        return false;
    }

    // Cannot join as my own opponent
    if (null !== loggedInUser && hostedGameData.host.id === loggedInUser.id) {
        return false;
    }

    // Cannot join if game is full
    if (null !== hostedGameData.opponent) {
        return false;
    }

    return true;
};

const join = async () => {
    const result = await lobbyStore.joinGame(gameId);

    if (true !== result) {
        console.error('could not join:', result);
    }
};

const confirmationOverlay = createOverlay(ConfirmationOverlay);

const resign = async (): Promise<void> => {
    const localPlayer = getLocalAppPlayer();

    if (null === localPlayer) {
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

        localPlayer.resign();
    } catch (e) {
        // resignation cancelled
    }
};

const toggleCoords = () => {
    if (null !== gameView) {
        gameView.toggleDisplayCoords();
    }
};
</script>

<template>
    <div class="position-relative">
        <app-board
            v-if="gameView"
            :game-view="gameView"
            :time-control-values="hostedGameClient?.getTimeControlValues()"
            :key="gameViewLoaded"
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
            <div class="d-flex justify-content-center">
                <button type="button" class="btn btn-link" v-if="getLocalAppPlayer()" @click="resign()"><i class="bi-flag"></i> Resign</button>
                <button type="button" class="btn btn-link" @click="toggleCoords()"><i class="bi-alphabet"></i> Coords</button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="stylus">
.join-button-container
    top 0
</style>
