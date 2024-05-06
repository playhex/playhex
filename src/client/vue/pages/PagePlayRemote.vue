<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/pixi-board/GameView';
import useLobbyStore from '@client/stores/lobbyStore';
import { ref } from 'vue';
import AppBoard from '@client/vue/components/AppBoard.vue';
import ConfirmationOverlay from '@client/vue/components/overlay/ConfirmationOverlay.vue';
import HostedGameClient from '../../HostedGameClient';
import { createOverlay } from 'unoverlay-vue';
import { Ref, onMounted, onUnmounted, watch, watchEffect } from 'vue';
import useSocketStore from '@client/stores/socketStore';
import useAuthStore from '@client/stores/authStore';
import Rooms from '@shared/app/Rooms';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';
import { useRoute, useRouter } from 'vue-router';
import { BIconFlag, BIconXLg, BIconCheck, BIconChatRightText, BIconChatRight, BIconArrowBarLeft, BIconRepeat } from 'bootstrap-icons-vue';
import usePlayerSettingsStore from '../../stores/playerSettingsStore';
import { storeToRefs } from 'pinia';
import { PlayerIndex } from '@shared/game-engine';
import { useSeoMeta } from '@unhead/vue';
import AppGameSidebar from '../components/AppGameSidebar.vue';

useSeoMeta({
    robots: 'noindex',
});

const { gameId } = useRoute().params;

const hostedGameClient = ref<null | HostedGameClient>(null);

const boardContainer = ref<HTMLElement>();
let gameView: null | GameView = null; // Cannot be a ref() because crash when toggle coords and hover board

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

const lobbyStore = useLobbyStore();
const { loggedInPlayer } = storeToRefs(useAuthStore());
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
    }[timeControlToCadencyName(hostedGameClient.value.getHostedGame().gameOptions)];
};

/*
 * Join/leave game room.
 * Not required if player is already in game,
 * but necessary for watchers to received game updates.
 */
useSocketStore().joinRoom(Rooms.game(gameId));
onUnmounted(() => useSocketStore().leaveRoom(Rooms.game(gameId)));

const getLocalPlayerIndex = (): number => {

    if (null === loggedInPlayer.value || !hostedGameClient.value) {
        return -1;
    }

    return hostedGameClient.value.getPlayerIndex(loggedInPlayer.value);
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
            // noop
        }
    });
};

const initGameView = () => {
    if (!hostedGameClient.value) {
        throw new Error('Cannot init game view now, no hostedGameClient');
    }

    const game = hostedGameClient.value.loadGame();

    if (!boardContainer.value) {
        throw new Error('Missing element with ref="boardContainer"');
    }

    gameView = new GameView(game, boardContainer.value);

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
const loadGame = async () => {
    // Must reload from server when I watch a game, I am not up to date
    // Or when I come back on a game where I did not received events, again not up to date
    hostedGameClient.value = await lobbyStore.retrieveHostedGameClient(gameId, true);

    if (!hostedGameClient.value) {
        router.push({ name: 'home' });
        return;
    }

    initGameView();

    const playerPseudos = hostedGameClient.value.getPlayers().map(p => p.pseudo);
    const { state, host } = hostedGameClient.value.getHostedGame();
    const stateForTitle = playerPseudos.length < 2 && 'created' === state
        ? 'Waiting for an opponent'
        : state[0].toUpperCase() + state.slice(1);
    const title = `${stateForTitle}: ${playerPseudos.join(' VS ')}`;
    const description = 'created' === state
        ? `Hex game, hosted by ${host.pseudo}, waiting for an opponent.`
        : `${state} Hex game, ${playerPseudos.join(' versus ')}.`
    ;

    useSeoMeta({
        robots: 'noindex',
        titleTemplate: site => `${title} - ${site}`,
        ogTitle: title,
        description,
        ogDescription: description,
    });
};

onMounted(() => loadGame());

const join = () => hostedGameClient.value?.sendJoinGame();

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
            message: 'Are you sure you want to resign the game?',
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
            message: 'Are you sure you want to cancel the game?',
            confirmLabel: 'Yes, cancel',
            confirmClass: 'btn-warning',
            cancelLabel: 'No, keep the game',
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
const canAcceptRematch: Ref<boolean> = ref(false);

watchEffect(async () => {
    if (hostedGameClient.value == null) return;
    const rematchId = hostedGameClient.value.getRematchGameId();
    if (rematchId == null) return;
    if (loggedInPlayer.value == null) return;
    if (getLocalPlayerIndex() === -1) return;
    const rematchGameClient = await lobbyStore.retrieveHostedGameClient(rematchId);
    if (rematchGameClient == null) return;
    canAcceptRematch.value = rematchGameClient.canJoin(loggedInPlayer.value);
});

const canRematch = (): boolean => {
    if (-1 === getLocalPlayerIndex() || null === hostedGameClient.value) {
        return false;
    }
    return hostedGameClient.value.canRematch();
};

const createOrAcceptRematch = async (): Promise<void> => {
    if (!hostedGameClient.value) {
        throw new Error('Error while trying to rematch, no current game');
    }

    const rematchId = hostedGameClient.value.getRematchGameId();
    let hostedRematchClient;

    if (rematchId != null) {
        hostedRematchClient = await lobbyStore.retrieveHostedGameClient(rematchId);
        if (hostedRematchClient == null) {
            throw new Error('A rematch game does not exist');
        }
    } else {
        hostedRematchClient = await lobbyStore.rematchGame(
            hostedGameClient.value.getId()
        );
    }

    if (loggedInPlayer && hostedRematchClient.canJoin(loggedInPlayer.value)) {
        await hostedRematchClient.sendJoinGame();
    }

    router.push({
        name: 'online-game',
        params: {
            gameId: hostedRematchClient.getId(),
        },
    });
};

const viewRematch = (): void => {
    if (!hostedGameClient.value) {
        throw new Error('Error while trying to view rematch, no current game');
    }
    const rematchId = hostedGameClient.value.getRematchGameId();
    if (rematchId == null) {
        throw new Error('Error while trying to view rematch, empty rematchId');
    }
    router.push({
        name: 'online-game',
        params: {
            gameId: rematchId
        }
    });
};

/*
 * Sidebar
 */
const sidebarOpen = ref(false);

watch(hostedGameClient, game => {
    if (null === game) {
        return;
    }

    game.on('chatMessagePosted', () => {
        if (sidebarOpen.value) {
            game.markAllMessagesRead();
        }
    });

    watch(sidebarOpen, () => game.markAllMessagesRead());
});

const unreadMessages = (): number => {
    if (null === hostedGameClient.value) {
        return 0;
    }

    return hostedGameClient.value.getChatMessages().length
        - hostedGameClient.value.getReadMessages()
    ;
};
</script>

<template>
    <div v-show="null !== hostedGameClient" class="game-and-sidebar-container" :class="sidebarOpen ? 'sidebar-open' : ''">
        <div class="game">
            <div class="board-container" ref="boardContainer">
                <AppBoard
                    v-if="null !== hostedGameClient && null !== gameView"
                    :players="hostedGameClient.getPlayers()"
                    :timeControlOptions="hostedGameClient.getTimeControlOptions()"
                    :timeControlValues="hostedGameClient.getTimeControlValues()"
                    :gameView="gameView"
                />

                <div v-if="hostedGameClient && hostedGameClient.canJoin(loggedInPlayer)" class="join-button-container">
                    <div class="d-flex justify-content-center">
                        <button class="btn btn-lg btn-success" @click="join()">Accept</button>
                    </div>
                </div>
            </div>

            <nav class="menu-game navbar" v-if="null !== hostedGameClient">
                <div class="buttons container-fluid">
                    <button type="button" class="btn btn-outline-primary" v-if="canResign() && !canCancel()" @click="resign()"><BIconFlag /><span class="btn-label"> Resign</span></button>
                    <button type="button" class="btn btn-outline-primary" v-if="canCancel()" @click="cancel()"><BIconXLg /><span class="btn-label"> Cancel</span></button>
                    <button type="button" class="btn" v-if="shouldDisplayConfirmMove()" :class="null === confirmMove ? 'btn-outline-secondary' : 'btn-success'" :disabled="null === confirmMove" @click="null !== confirmMove && confirmMove()"><BIconCheck /> Confirm<span class="btn-label"> move</span></button>
                    <button type="button" class="btn btn-outline-primary" v-if="canRematch()" @click="createOrAcceptRematch()">
                        <BIconRepeat />
                        <span class="btn-label"> Rematch</span>
                    </button>
                    <template v-else-if="hostedGameClient.getRematchGameId() != null">
                        <button type="button" class="btn btn-success" v-if="canAcceptRematch" @click="createOrAcceptRematch()">
                            Accept rematch
                        </button>
                        <button type="button" class="btn btn-outline-primary" v-else @click="viewRematch()">
                            View rematch
                        </button>
                    </template>
                    <button type="button" class="btn btn-outline-primary position-relative" @click="sidebarOpen = true">
                        <BIconChatRightText v-if="hostedGameClient.getChatMessages().length > 0" />
                        <BIconChatRight v-else />
                        <span class="btn-label"> Chat</span>
                        <span v-if="unreadMessages() > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            {{ unreadMessages() }}
                            <span class="d-none"> unread messages</span>
                        </span>
                    </button>

                    <button v-if="!sidebarOpen" type="button" class="btn btn-outline-primary toggle-sidebar-btn" @click="sidebarOpen = true" aria-label="Open game sidebar and chat"><BIconArrowBarLeft /></button>
                </div>
            </nav>
        </div>

        <div class="sidebar bg-body" v-if="(hostedGameClient instanceof HostedGameClient)">
            <AppGameSidebar
                :hostedGameClient="hostedGameClient"
                @close="sidebarOpen = false"
                @toggle-coords="toggleCoords()"
            />
        </div>
    </div>

    <div v-if="null === hostedGameClient || null === gameView" class="container-fluid my-3">
        <p class="lead text-center">Loading game…</p>
    </div>
</template>

<style scoped lang="stylus">
.join-button-container
    top 0
    position absolute
    width 100%
    margin-top 1em

.board-container
    position relative // center "Accept" button relative to this container
    height calc(100vh - 6rem) // (fallback if dvh is not supported)
    height calc(100dvh - 6rem) // 6rem = header and bottom game menu height

.menu-game
    // Mobile UI fix: add margin at bottom if url bar is present,
    // so it is possible to scroll to hide url bar and set full height again,
    // then the UI will fit 100vh again.
    margin-bottom calc(100lvh - 100dvh)

.buttons
    position relative
    display flex
    justify-content center
    gap 0.5em

.btn-label
    display none

    @media (min-width: 768px)
        display inline

.game-and-sidebar-container
    position relative
    display flex

    .game
        width 100%

    .sidebar
        position relative
        display none
        width 75%

        @media (max-width: 575px)
            width 100%
            position absolute
            right 0
            top 0
            bottom 0
            --bs-bg-opacity 0.85
            // backdrop-filter blur(2px) // laggy on mobile

.sidebar-open
    .game
        width 100%

        @media (min-width: 576px)
            width 50%

        @media (min-width: 992px)
            width 67%

    .sidebar
        display flex
        width 100%

        @media (min-width: 576px)
            width 50%

        @media (min-width: 992px)
            width 33%

.buttons
    .toggle-sidebar-btn
        position absolute
        right 0
        margin-right 0.75em
</style>
