<script setup lang="ts">
/* eslint-env browser */
import 'bootstrap/js/dist/dropdown';
import useLobbyStore from '../../stores/lobbyStore.js';
import { ref, computed } from 'vue';
import AppBoard from '../components/AppBoard.vue';
import ConfirmationOverlay from '../components/overlay/ConfirmationOverlay.vue';
import { defineOverlay } from '@overlastic/vue';
import { Ref, onUnmounted, watch, watchEffect } from 'vue';
import useSocketStore from '../../stores/socketStore.js';
import useAuthStore from '../../stores/authStore.js';
import Rooms from '../../../shared/app/Rooms.js';
import { useRoute, useRouter } from 'vue-router';
import { IconFlag, IconXLg, IconCheck, IconArrowBarLeft, IconRepeat, IconArrowCounterclockwise, IconX, IconRewind, IconList, IconArrowDownUp, IconSignpostSplit } from '../icons.js';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';
import { storeToRefs } from 'pinia';
import { t } from 'i18next';
import { Game } from '../../../shared/game-engine/index.js';
import { injectHead, useSeoMeta } from '@unhead/vue';
import AppGameSidebar from '../components/AppGameSidebar.vue';
import AppConnectionAlert from '../components/AppConnectionAlert.vue';
import { HostedGame } from '../../../shared/app/models/index.js';
import { pseudoString } from '../../../shared/app/pseudoUtils.js';
import AppHexWorldExplore from '../components/AppHexWorldExplore.vue';
import { apiPostRematch } from '../../apiClient.js';
import { canJoin, getPlayers, shouldShowConditionalMoves } from '../../../shared/app/hostedGameUtils.js';
import { useGuestJoiningCorrespondenceWarning } from '../composables/guestJoiningCorrespondenceWarning.js';
import GameFinishedOverlay from '../components/overlay/GameFinishedOverlay.vue';
import GameView from '../../../shared/pixi-board/GameView.js';
import useCurrentGameStore from '../../stores/currentGameStore.js';

const head = injectHead();

const { gameId } = useRoute().params;

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

const {
    hostedGame,
    gameView,

    isMyTurn,
    players,
    localPlayerIndex,
    shouldDisplayConfirmMove,
    canCancel,
    shouldDisplayAnswerUndoMove,
    shouldDisplayUndoMove,
    shouldDisableUndoMove,
    canRematch,
    shouldShowPass,
    shouldEnablePass,
} = storeToRefs(useCurrentGameStore());

const {
    loadGame,

    askUndo,
    answerUndo,
    sendMove,
    sendPremove,
    cancelPremove,
    sendPass,
    sendResign,
    sendCancel,
    enableSimulationMode,
} = useCurrentGameStore();

const socketStore = useSocketStore();
const lobbyStore = useLobbyStore();
const { loggedInPlayer } = storeToRefs(useAuthStore());
const router = useRouter();

/*
 * Confirm move
 */
const { localSettings } = usePlayerLocalSettingsStore();
const confirmMove: Ref<null | (() => void)> = ref(null);

loadGame(gameId);

const makeTitle = (hostedGame: HostedGame) => {
    const players = hostedGame.hostedGameToPlayers.map(h => h.player);
    const { state } = hostedGame;
    const playerPseudos = players.map(p => pseudoString(p, 'pseudo'));
    if (players.length < 2 && state === 'created')
        return `${t('game.title_waiting')} ${playerPseudos[0]}`;
    let yourTurn = '';
    if (state === 'playing' && loggedInPlayer.value != null) {
        const player = loggedInPlayer.value;
        const index = players.findIndex(p => p.publicId === player.publicId);
        if (index != null && hostedGame.currentPlayerIndex === index) {
            yourTurn = `• ${t('game.title_your_turn')} • `;
        }
    }
    const pairing = playerPseudos.join(' VS ');
    return `${yourTurn}${t('game_state.' + state)}: ${pairing}`;
};

/*
 * Load game
 */
let unlistenGameUpdates: null | (() => void) = null;

// TODO
socketStore.socket.on('gameUpdate', (publicId, hostedGame) => {
    // ignore if not my game, or already initialized
    if (publicId !== gameId) {
        return;
    }

    // I received update but game seems not to exists.
    if (hostedGame === null) {
        void router.push({ name: 'home' });
        return;
    }

    const playerPseudos = getPlayers(hostedGame).map(p => p.pseudo);
    const { state, host } = hostedGame;
    const description = state === 'created'
        ? `Hex game, hosted by ${host?.pseudo ?? 'system'}, waiting for an opponent.`
        : `Hex game, ${playerPseudos.join(' versus ')}.`
    ;

    useSeoMeta({
        title: computed(() => {
            if (hostedGame == null) return '';
            return makeTitle(hostedGame);
        }),
        description,
        ogDescription: description,
    }, { head });
});

/*
 * Join/leave game room.
 *
 * Must join after we set up the gameUpdate listener,
 * in order to initialize game properly.
 */
watchEffect(() => {
    if (socketStore.connected)
        socketStore.joinRoom(Rooms.game(gameId));
});

onUnmounted(() => {
    socketStore.leaveRoom(Rooms.game(gameId));

    if (unlistenGameUpdates !== null) {
        unlistenGameUpdates();
        unlistenGameUpdates = null;
    }
});

/*
 * Join game
 */
const join = async () => {
    if (hostedGame.value === null) {
        return;
    }

    if (isGuestJoiningCorrepondence(hostedGame.value)) {
        try {
            await createGuestJoiningCorrepondenceWarningOverlay();
        } catch (e) {
            return;
        }
    }

    return lobbyStore.joinGame(hostedGame.value.publicId);
};

const confirmationOverlay = defineOverlay(ConfirmationOverlay);

/*
 * Resign
 */
const canResign = (): boolean => {
    if (localPlayerIndex.value === null || hostedGame.value === null) {
        return false;
    }

    return hostedGame.value.state === 'playing';
};

const resign = async (): Promise<void> => {
    if (localPlayerIndex.value === null) {
        return;
    }

    try {
        await confirmationOverlay({
            title: t('resign_confirm_overlay.title'),
            message: t('resign_confirm_overlay.message'),
            confirmLabel: t('resign_confirm_overlay.confirmLabel'),
            confirmClass: 'btn-danger',
            cancelLabel: t('resign_confirm_overlay.cancelLabel'),
            cancelClass: 'btn-outline-primary',
        });

        await sendResign();
    } catch (e) {
        // resignation canceled
    }
};

/*
 * Cancel
 */
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

    await sendCancel();
};

const toggleCoords = () => {
    gameView.value?.toggleDisplayCoords();
};

/*
 * Rematch
 */
const canAcceptRematch: Ref<boolean> = ref(false);

watchEffect(() => {
    if (!hostedGame.value) return;
    const rematch = hostedGame.value.rematch ?? null;
    if (rematch == null) return;
    if (loggedInPlayer.value == null) return;
    if (localPlayerIndex.value === null) return;
    canAcceptRematch.value = canJoin(rematch, loggedInPlayer.value);
});

const createOrAcceptRematch = async (): Promise<void> => {
    if (!hostedGame.value) {
        throw new Error('Error while trying to rematch, no current game');
    }

    const rematchId = hostedGame.value.rematch?.publicId ?? null;
    let hostedGameRematch: null | HostedGame = null;

    if (rematchId != null) {
        hostedGameRematch = await lobbyStore.getOrFetchHostedGame(rematchId);
        if (hostedGameRematch == null) {
            throw new Error('A rematch game does not exist');
        }
    } else {
        hostedGameRematch = await apiPostRematch(hostedGame.value.publicId);
    }

    if (loggedInPlayer && canJoin(hostedGameRematch, loggedInPlayer.value)) {
        await lobbyStore.joinGame(hostedGameRematch.publicId);
    }

    void router.push({
        name: 'online-game',
        params: {
            gameId: hostedGameRematch.publicId,
        },
    });
};

/*
 * Sidebar
 */
const showSidebar = (open = true): void => {
    localSettings.openSidebar = open;
};

const isSidebarCurrentlyOpen = (): boolean => {
    if (undefined !== localSettings.openSidebar) {
        return localSettings.openSidebar;
    }

    return window.screen.width >= 576;
};

/*
 * Chat
 */
watch(hostedGame, game => {
    if (game === null) {
        return;
    }

    // TODO
    // game.on('chatMessagePosted', () => {
    //     if (isSidebarCurrentlyOpen()) {
    //         game.markAllMessagesRead();
    //     }
    // });

    // watch(localSettings, () => {
    //     if (isSidebarCurrentlyOpen()) {
    //         game.markAllMessagesRead();
    //     }
    // });
});

const unreadMessages = (): number => {
    return 0; // TODO
    // if (hostedGameClient.value === null) {
    //     return 0;
    // }

    // return hostedGameClient.value.getChatMessages().length
    //     - hostedGameClient.value.getReadMessages()
    // ;
};

/*
 * Pass
 */
const pass = async () => {
    try {
        await confirmationOverlay({
            title: t('pass_confirm_overlay.title'),
            message: t('pass_confirm_overlay.message'),
            confirmLabel: t('pass_confirm_overlay.confirmLabel'),
            confirmClass: 'btn-warning',
            cancelLabel: t('pass_confirm_overlay.cancelLabel'),
            cancelClass: 'btn-outline-primary',
        });

        await sendPass();
    } catch (e) {
        // noop, player said no
    }
};

/*
 * Warning when guest joining correspondence game
 */
const {
    createGuestJoiningCorrepondenceWarningOverlay,
    isGuestJoiningCorrepondence,
} = useGuestJoiningCorrespondenceWarning();

/*
 * Conditional moves
 */
const { conditionalMovesEditor } = storeToRefs(useConditionalMovesStore());
const { initConditionalMoves, resetConditionalMoves } = useConditionalMovesStore();

watch([hostedGame, loggedInPlayer], () => {
    if (hostedGame.value === null || loggedInPlayer.value === null || gameView === null) {
        return;
    }

    if (!shouldShowConditionalMoves(hostedGame.value, loggedInPlayer.value)) {
        return;
    }

    void initConditionalMoves(
        hostedGame.value,
        gameView,
        localPlayerIndex.value,
    );
});

onUnmounted(() => resetConditionalMoves());

/*
 * Game end: win popin
 */
const unlisteners: (() => void)[] = [];
const gameFinishedOverlay = defineOverlay(GameFinishedOverlay);

const initWinOverlay = (gameView: GameView, game: Game) => {
    const listener = () => {
        const players = hostedGameClient.value?.getPlayers();

        if (!players) {
            throw new Error('Unexpected no players, but needed to show the winner');
        }

        void gameFinishedOverlay({
            game,
            players,
        });
    };

    gameView.on('endedAndWinAnimationOver', listener);

    unlisteners.push(() => gameView.off('endedAndWinAnimationOver', listener));
};

onUnmounted(() => unlisteners.forEach(unlistener => unlistener()));
</script>

<template>
    <div v-show="hostedGame" class="game-and-sidebar-container" :class="localSettings.openSidebar ? 'sidebar-open' : (undefined === localSettings.openSidebar ? 'sidebar-auto' : 'sidebar-closed')">
        <div class="game">

            <!-- Game board, "Accept" button -->
            <div class="board-container">
                <AppBoard
                    v-if="hostedGame"
                    :players
                    :timeControlOptions="hostedGame.timeControlType"
                    :timeControlValues="hostedGame.timeControl!"
                    :gameView="gameView"
                />

                <div v-if="hostedGame && canJoin(hostedGame, loggedInPlayer)" class="join-button-container">
                    <div class="d-flex justify-content-center">
                        <button
                            class="btn btn-lg"
                            :class="isGuestJoiningCorrepondence(hostedGame) ? 'btn-outline-warning' : 'btn-success'"
                            @click="join()"
                        >Accept</button>
                    </div>
                </div>
            </div>

            <!-- Control buttons at bottom of game board (resign, undo, confirm move, ...) -->
            <nav class="menu-game navbar" v-if="hostedGame">
                <div class="buttons container-fluid">

                    <!-- rewind mode -->
                    <button type="button" v-if="null !== gameView" @click="() => enableSimulationMode()" class="btn btn-outline-primary">
                        <IconRewind />
                    </button>

                    <!-- Conditional moves -->
                    <button type="button" v-if="null !== loggedInPlayer && shouldShowConditionalMoves(hostedGame, loggedInPlayer)" @click="conditionalMovesEditor?.enableSimulationMode()" class="btn btn-outline-primary" :disabled="null === conditionalMovesEditor">
                        <IconSignpostSplit />
                    </button>

                    <!-- Resign -->
                    <button type="button" class="btn btn-outline-danger" v-if="canResign() && !canCancel" @click="resign()">
                        <IconFlag />
                        <span class="hide-sm">{{ ' ' + $t('resign') }}</span>
                    </button>

                    <!-- Cancel -->
                    <button type="button" class="btn btn-outline-warning" v-if="canCancel" @click="cancel()">
                        <IconXLg />
                        <span class="hide-sm">{{ ' ' + $t('cancel') }}</span>
                    </button>

                    <!-- Confirm move -->
                    <button type="button" class="btn" v-if="shouldDisplayConfirmMove" :class="null === confirmMove ? 'btn-outline-secondary' : 'btn-success'" :disabled="null === confirmMove" @click="null !== confirmMove && confirmMove()">
                        <IconCheck />
                        <span class="d-md-none">{{ ' ' + $t('confirm_move.button_label_short') }}</span>
                        <span class="hide-sm">{{ ' ' + $t('confirm_move.button_label') }}</span>
                    </button>

                    <!-- Undo accept -->
                    <button type="button" class="btn btn-success" v-if="shouldDisplayAnswerUndoMove" @click="answerUndo(true)">
                        <IconCheck />
                        <span class="hide-sm">{{ $t('undo.accept') }}</span>
                    </button>

                    <!-- Undo reject -->
                    <button type="button" class="btn btn-danger" v-if="shouldDisplayAnswerUndoMove" @click="answerUndo(false)">
                        <IconX />
                        <span class="hide-sm">{{ $t('undo.reject') }}</span>
                    </button>

                    <!-- Rematch -->
                    <button type="button" class="btn btn-outline-primary" v-if="canRematch" @click="createOrAcceptRematch()">
                        <IconRepeat />
                        <span class="hide-sm">{{ ' ' + $t('rematch.label') }}</span>
                    </button>

                    <!-- Accept / View rematch -->
                    <template v-else-if="hostedGame.rematch?.publicId">
                        <button v-if="canAcceptRematch" type="button" class="btn btn-success" @click="createOrAcceptRematch()">
                            {{ ' ' + $t('rematch.accept') }}
                        </button>
                        <router-link v-else :to="{ name: 'online-game', params: { gameId: hostedGame.rematch.publicId } }" class="btn btn-outline-primary">
                            {{ ' ' + $t('rematch.view') }}
                        </router-link>
                    </template>

                    <!-- Right button, open sidebar -->
                    <button type="button" class="btn btn-outline-primary open-sidebar-btn" @click="showSidebar()" aria-label="Open game sidebar and chat">
                        <IconArrowBarLeft />
                        <span v-if="unreadMessages() > 0" class="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-danger">
                            {{ unreadMessages() }}
                            <span class="d-none">{{ ' ' + $t('unread_messages') }}</span>
                        </span>
                    </button>

                    <!-- Secondary actions dropup -->
                    <div class="dropup-center dropup">

                        <!-- Dropup button -->
                        <button type="button" class="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" aria-label="Secondary actions" aria-expanded="false" data-bs-auto-close="true">
                            <IconList />
                        </button>

                        <!-- Secondary actions -->
                        <div class="dropdown-menu">

                            <!-- Pass -->
                            <button
                                v-if="shouldShowPass"
                                type="button"
                                class="dropdown-item"
                                :class="shouldEnablePass ? 'text-warning' : 'text-secondary disabled'"
                                :disabled="!shouldEnablePass"
                                @click="pass()"
                            >
                                <IconArrowDownUp />
                                {{ $t('pass') }}
                            </button>

                            <!-- Undo -->
                            <button
                                v-if="shouldDisplayUndoMove"
                                type="button"
                                class="dropdown-item"
                                :class="!shouldDisableUndoMove ? 'text-primary' : 'disabled'"
                                :disabled="shouldDisableUndoMove"
                                @click="askUndo()"
                            >
                                <IconArrowCounterclockwise />
                                {{ $t('undo.undo_move') }}
                            </button>

                            <div><hr class="dropdown-divider"></div>

                            <!-- Explore -->
                            <!-- TODO -->
                            <!-- <AppHexWorldExplore
                                v-if="gameView"
                                :hostedGameClient
                                :gameView
                                :label="$t('explore')"
                                class="dropdown-item"
                            /> -->
                        </div>
                    </div>

                </div>
            </nav>
        </div>

        <!-- Game sidebar -->
        <div class="sidebar bg-body" v-if="hostedGame">
            <AppGameSidebar
                :hostedGame
                @close="showSidebar(false)"
                @toggleCoords="toggleCoords()"
            />
        </div>
    </div>

    <div v-if="!hostedGame" class="container-fluid my-3">
        <p class="lead text-center">{{ $t('loading_game') }}</p>
    </div>

    <AppConnectionAlert />
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

.game-and-sidebar-container
    position relative
    display flex

    .game
        width 100%

    .sidebar
        display none
        height calc(100vh - 3rem) // (fallback if dvh is not supported)
        height calc(100dvh - 3rem) // 3rem = header height

    .open-sidebar-btn
        position absolute
        right 0
        margin-right 0.75em

sidebarOpen()
    .game
        width 100%

        @media (min-width: 576px)
            width 50%

        @media (min-width: 992px)
            width 55%

        @media (min-width: 1200px)
            width 64%

        @media (min-width: 1400px)
            width 68%

    .sidebar
        display flex
        position relative
        width 100%

        @media (max-width: 575.5px) // .5 is a fix because sometimes 575px only is not inclusive
            position absolute
            right 0
            top 0
            bottom 0
            --bs-bg-opacity 0.85
            // backdrop-filter blur(2px) // laggy on mobile

        @media (min-width: 576px)
            width 50%

        @media (min-width: 992px)
            width 45%

        @media (min-width: 1200px)
            width 36%

        @media (min-width: 1400px)
            width 32%

    .open-sidebar-btn
        display none

.sidebar-open
    sidebarOpen()

.sidebar-auto
    @media (min-width: 576px)
        sidebarOpen()

// Custom hidden when limited space:
// hide on small screen, and medium screen when sidebar is open.
.game-and-sidebar-container
    &.sidebar-closed
        .hide-sm
            display none

            @media (min-width: 576px)
                display unset

    &.sidebar-open, &.sidebar-auto
        .hide-sm
            display none

            @media (min-width: 992px)
                display unset
</style>
