<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/pixi-board/GameView';
import useLobbyStore from '@client/stores/lobbyStore';
import { ref } from '@vue/runtime-core';
import AppBoard from '@client/vue/components/AppBoard.vue';
import ConfirmationOverlay from '@client/vue/components/overlay/ConfirmationOverlay.vue';
import HostedGameClient from '../../HostedGameClient';
import { createOverlay } from 'unoverlay-vue';
import { Ref, onUnmounted, watch } from 'vue';
import useSocketStore from '@client/stores/socketStore';
import useAuthStore from '@client/stores/authStore';
import Rooms from '@shared/app/Rooms';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';
import { useRoute, useRouter } from 'vue-router';
import { BIconFlag, BIconX, BIconCheck, BIconAlphabet } from 'bootstrap-icons-vue';
import usePlayerSettingsStore from '../../stores/playerSettingsStore';
import { storeToRefs } from 'pinia';
import { PlayerIndex } from '@shared/game-engine';

const { gameId } = useRoute().params;

const hostedGameClient = ref<null | HostedGameClient>(null);

let gameView: null | GameView = null; // Cannot be a ref() because crash when toggle coords and hover board

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

const lobbyStore = useLobbyStore();
const router = useRouter();

/*
 * Confirm move
 */
const { playerSettings } = storeToRefs(usePlayerSettingsStore());
const confirmMove: Ref<null | (() => void)> = ref(null);

const shouldDisplayConfirmMove = (): boolean => {
    if (null === hostedGameClient.value || null === playerSettings.value) {
        return false;
    }

    // I am watcher
    if (-1 === getLocalPlayerIndex()) {
        return false;
    }

    // Game has ended. Still display button when game is not yet started to make sure it works
    if ('ended' === hostedGameClient.value.getState()) {
        return false;
    }

    return {
        blitz: playerSettings.value.confirmMoveBlitz,
        normal: playerSettings.value.confirmMoveNormal,
        correspondance: playerSettings.value.confirmMoveCorrespondance,
    }[timeControlToCadencyName(hostedGameClient.value.getHostedGameData().gameOptions)];
};

/*
 * Join/leave game room.
 * Not required if player is already in game,
 * but necessary for watchers to received game updates.
 */
useSocketStore().joinRoom(Rooms.game(gameId));
onUnmounted(() => useSocketStore().leaveRoom(Rooms.game(gameId)));

const getLocalPlayerIndex = (): number => {
    const { loggedInPlayer } = useAuthStore();

    if (null === loggedInPlayer || !hostedGameClient.value) {
        return -1;
    }

    return hostedGameClient.value.getPlayerIndex(loggedInPlayer);
};

const listenHexClick = () => {
    if (null === gameView) {
        throw new Error('no game view');
    }

    gameView.on('hexClicked', move => {
        if (null === hostedGameClient.value) {
            throw new Error('hex clicked but hosted game is null');
        }

        const game = hostedGameClient.value.getGame();

        try {
            // Must get local player again in case player joined after (click "Watch", then "Join")
            const localPlayerIndex = getLocalPlayerIndex();

            if (-1 === localPlayerIndex) {
                return;
            }

            hostedGameClient.value.getGame().checkMove(move, localPlayerIndex as PlayerIndex);

            if (!shouldDisplayConfirmMove()) {
                game.move(move, localPlayerIndex as PlayerIndex);
                hostedGameClient.value.sendMove(move);
                return;
            }

            confirmMove.value = () => {
                gameView?.removePreviewMove();
                game.move(move, localPlayerIndex as PlayerIndex);
                hostedGameClient.value?.sendMove(move);
                confirmMove.value = null;
            };

            gameView?.previewMove(move, localPlayerIndex as PlayerIndex);
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

    if (null !== playerSettings.value) {
        gameView.setDisplayCoords(playerSettings.value.showCoords);
        gameView.setOrientation({
            landscape: playerSettings.value.orientationLandscape,
            portrait: playerSettings.value.orientationPortrait,
        });
    }

    watch(playerSettings, settings => {
        if (null === gameView || null === settings) {
            return;
        }

        gameView.setDisplayCoords(settings.showCoords);
        gameView.setOrientation({
            landscape: settings.orientationLandscape,
            portrait: settings.orientationPortrait,
        });
    });

    if ('playing' === hostedGameClient.value.getState()) {
        listenHexClick();
    } else {
        hostedGameClient.value.on('started', () => listenHexClick());
    }
};

/*
 * Load game
 */
(async () => {
    // Must reload from server when I watch a game, I am not up to date
    // Or when I come back on a game where I did not received events, again not up to date
    hostedGameClient.value = await lobbyStore.retrieveHostedGameClient(gameId, true);

    if (!hostedGameClient.value) {
        router.push({ name: 'home' });
        return;
    }

    initGameView();
})();

const join = async () => {
    const result = await hostedGameClient.value?.sendJoinGame();

    if (true !== result) {
        console.error('could not join:', result);
    }
};

const confirmationOverlay = createOverlay(ConfirmationOverlay);

/*
 * Resign
 */
const canResign = (): boolean => {
    if (-1 === getLocalPlayerIndex() || null === hostedGameClient.value) {
        return false;
    }

    return hostedGameClient.value.canResign();
};

const resign = async (): Promise<void> => {
    const localPlayerIndex = getLocalPlayerIndex();

    if (-1 === localPlayerIndex) {
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

        hostedGameClient.value?.sendResign();
    } catch (e) {
        // resignation canceled
    }
};

/*
 * Cancel
 */
const canCancel = (): boolean => {
    if (-1 === getLocalPlayerIndex() || null === hostedGameClient.value) {
        return false;
    }

    return hostedGameClient.value.canCancel();
};

const cancel = async (): Promise<void> => {
    try {
        await confirmationOverlay({
            title: 'Cancel game',
            message: 'Are you sure you want to cancel game?',
            confirmLabel: 'Yes, cancel',
            confirmClass: 'btn-success',
            cancelLabel: 'No, keep game',
            cancelClass: 'btn-outline-primary',
        });
    } catch (e) {
        // cancelation canceled
        return;
    }

    hostedGameClient.value?.sendCancel();
};

const toggleCoords = () => {
    if (null !== gameView) {
        gameView.toggleDisplayCoords();
    }
};

/*
 * Rematch
 */
const rematch = async (): Promise<void> => {
    if (!hostedGameClient.value) {
        throw new Error('Error while trying to rematch, no current game');
    }

    const hostedGameClientRematch = await lobbyStore.createGame(
        hostedGameClient.value.getHostedGameData().gameOptions,
    );

    router.push({
        name: 'online-game',
        params: {
            gameId: hostedGameClientRematch.getId(),
        },
    });
};
</script>

<template>
    <div class="position-relative">
        <app-board
            v-if="(hostedGameClient instanceof HostedGameClient) && null !== gameView"
            :players="hostedGameClient.getPlayers()"
            :time-control-options="hostedGameClient.getTimeControlOptions()"
            :time-control-values="hostedGameClient.getTimeControlValues()"
            :game-view="gameView"
            :rematch="rematch"
        ></app-board>
        <p v-else>Loading game {{ gameId }}…</p>

        <div v-if="hostedGameClient && hostedGameClient.canJoin(useAuthStore().loggedInPlayer)" class="position-absolute w-100 join-button-container">
            <div class="d-flex justify-content-center">
                <button class="btn btn-lg btn-success" @click="join()">Accept</button>
            </div>
        </div>
    </div>

    <nav class="menu-game navbar">
        <div class="container-fluid justify-content-center">
            <button type="button" class="btn btn-link" v-if="canResign() && !canCancel()" @click="resign()"><b-icon-flag /> Resign</button>
            <button type="button" class="btn btn-link" v-if="canCancel()" @click="cancel()"><b-icon-x /> Cancel</button>
            <button type="button" class="btn" v-if="shouldDisplayConfirmMove()" :class="null === confirmMove ? 'btn-outline-secondary' : 'btn-success'" :disabled="null === confirmMove" @click="null !== confirmMove && confirmMove()"><b-icon-check /> Confirm move</button>
            <button type="button" class="btn btn-link" @click="toggleCoords()"><b-icon-alphabet /> Coords</button>
        </div>
    </nav>
</template>

<style scoped lang="stylus">
.join-button-container
    top 0
</style>
