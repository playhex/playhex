<script setup lang="ts">
/* eslint-env browser */
import { useRoute, useRouter } from 'vue-router';
import GameView from '@client/pixi-board/GameView';
import useLobbyStore from '@client/stores/lobbyStore';
import useAuthStore from '@client/stores/authStore';
import { ref } from '@vue/runtime-core';
import AppBoard from '@client/vue/components/AppBoard.vue';
import ConfirmationOverlay from '@client/vue/components/ConfirmationOverlay.vue';
import { playerCanJoinGame } from '@shared/app/GameUtils';
import { storeToRefs } from 'pinia';
import GameClientSocket from 'GameClientSocket';
import { Game } from '@shared/game-engine';
import ClientPlayer from 'ClientPlayer';
import { createOverlay } from 'unoverlay-vue';
import { onUnmounted } from 'vue';
import useSocketStore from '@client/stores/socketStore';

const { loggedInUser } = storeToRefs(useAuthStore());
const route = useRoute();
const router = useRouter();
const lobbyStore = useLobbyStore();
let gameView: null | GameView = null; // Cannot be a ref() because crash when toggle coords and hover board
const gameViewLoaded = ref(false);
let gameClientSocket = ref<null | GameClientSocket>(null);
let game: Game;
let localPlayer = ref<null | ClientPlayer>(null);
const { gameId } = route.params;

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

useSocketStore().joinGameRoom(gameId);
onUnmounted(() => useSocketStore().leaveGameRoom(gameId));

(async () => {
    gameClientSocket.value = await lobbyStore.retrieveGameClientSocket(gameId);

    if (!gameClientSocket.value) {
        console.error(`Game ${gameId} no longer exists.`);
        router.push({ name: 'home' });
        return;
    }

    game = gameClientSocket.value.getGame();
    localPlayer.value = gameClientSocket.value.getLocalPlayer();

    gameView = new GameView(game);

    gameView.on('hexClicked', move => {
        try {
            gameClientSocket.value?.getLocalPlayer()?.move(move);
        } catch (e) {
            console.log('Move not played: ' + e);
        }
    });

    gameViewLoaded.value = true;
})();

const canJoin = (): boolean => {
    const game = gameView?.getGame();
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
    const result = await lobbyStore.joinGame(gameId);

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

const toggleCoords = () => {
    if (null !== gameView) {
        gameView.toggleDisplayCoords();
    }
};
</script>

<template>
    <div class="position-relative">
        <app-board
            v-if="gameViewLoaded && gameView"
            :game-view="gameView"
            :time-control-values="gameClientSocket?.getTimeControlValues()"
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
                <button type="button" class="btn btn-link" v-if="localPlayer" @click="resign()"><i class="bi-flag"></i> Resign</button>
                <button type="button" class="btn btn-link" @click="toggleCoords()"><i class="bi-alphabet"></i> Coords</button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="stylus">
.join-button-container
    top 0
</style>
