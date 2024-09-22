<script setup lang="ts">
/* eslint-env browser */
import useLobbyStore from '@client/stores/lobbyStore';
import { ref, computed } from 'vue';
import AppBoard from '@client/vue/components/AppBoard.vue';
import ConfirmationOverlay from '@client/vue/components/overlay/ConfirmationOverlay.vue';
import HostedGameClient from '../../HostedGameClient';
import { defineOverlay } from '@overlastic/vue';
import { Ref, onMounted, onUnmounted, watch, watchEffect } from 'vue';
import useSocketStore from '@client/stores/socketStore';
import useAuthStore from '@client/stores/authStore';
import Rooms from '@shared/app/Rooms';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';
import { useRoute, useRouter } from 'vue-router';
import { BIconFlag, BIconXLg, BIconCheck, BIconChatRightText, BIconChatRight, BIconArrowBarLeft, BIconRepeat, BIconArrowCounterclockwise, BIconX, BIconRewind } from 'bootstrap-icons-vue';
import usePlayerSettingsStore from '../../stores/playerSettingsStore';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore';
import { storeToRefs } from 'pinia';
import i18next from 'i18next';
import { PlayerIndex } from '@shared/game-engine';
import { useSeoMeta } from '@unhead/vue';
import AppGameSidebar from '../components/AppGameSidebar.vue';
import { fromEngineMove } from '../../../shared/app/models/Move';
import { pseudoString } from '../../../shared/app/pseudoUtils';
import { CustomizedGameView } from '../../services/CustomizedGameView';

useSeoMeta({
    robots: 'noindex',
});

const { gameId } = useRoute().params;

const hostedGameClient: Ref<HostedGameClient | null> = ref(null);

let gameView: null | CustomizedGameView = null; // Cannot be a ref() because crash when toggle coords and hover board. Also, using .mount() on a ref is very laggy.

/**
 * When game is loaded, gameView instanciated
 */
const gameViewInitialized = ref(false);

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
const { localSettings } = usePlayerLocalSettingsStore();
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
        correspondence: playerSettings.value.confirmMoveCorrespondence,
    }[timeControlToCadencyName(hostedGameClient.value.getHostedGame().gameOptions)];
};

/*
 * Undo move
 */
const shouldDisplayUndoMove = (): boolean => {
    if (null === hostedGameClient.value || null === playerSettings.value) {
        return false;
    }

    // I am watcher
    if (-1 === getLocalPlayerIndex()) {
        return false;
    }

    if ('playing' !== hostedGameClient.value.getState()) {
        return false;
    }

    // Show a disabled button if I sent an undo request,
    // but hide it if opponent sent an undo request.
    if (hostedGameClient.value?.getUndoRequest() === 1 - getLocalPlayerIndex()) {
        return false;
    }

    return true;
};

const shouldDisableUndoMove = (): boolean => {
    if (!hostedGameClient.value) {
        return true;
    }

    const game = hostedGameClient.value.getGame();

    return hostedGameClient.value.getUndoRequest() === getLocalPlayerIndex()
        || true !== game.canPlayerUndo(getLocalPlayerIndex() as PlayerIndex)
    ;
};

const shouldDisplayAnswerUndoMove = (): boolean => {
    if (!hostedGameClient.value) {
        return false;
    }

    if ('playing' !== hostedGameClient.value.getState()) {
        return false;
    }

    return hostedGameClient.value?.getUndoRequest() === 1 - getLocalPlayerIndex();
};

const askUndo = (): void => {
    hostedGameClient.value?.sendAskUndo();
};

const answerUndo = (accept: boolean): void => {
    hostedGameClient.value?.sendAnswerUndo(accept);
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

    gameView.on('hexClicked', coords => {
        if (null === hostedGameClient.value) {
            throw new Error('hex clicked but hosted game is null');
        }

        const game = hostedGameClient.value.getGame();
        const move = game.createMoveOrSwapMove(coords);

        try {
            // Must get local player again in case player joined after (click "Watch", then "Join")
            const localPlayerIndex = getLocalPlayerIndex();

            if (-1 === localPlayerIndex) {
                return;
            }

            hostedGameClient.value.getGame().checkMove(move, localPlayerIndex as PlayerIndex);

            // Send move if move preview is not enabled
            if (!shouldDisplayConfirmMove()) {
                game.move(move, localPlayerIndex as PlayerIndex);
                hostedGameClient.value.sendMove(fromEngineMove(move));
                return;
            }

            // Cancel move preview if I click on it
            const previewedMove = gameView?.getPreviewedMove();

            if (previewedMove && previewedMove.move.sameAs(move)) {
                gameView?.removePreviewMove();
                confirmMove.value = null;
                return;
            }

            // What happens when I validate move
            confirmMove.value = () => {
                game.move(move, localPlayerIndex as PlayerIndex);
                confirmMove.value = null;

                if (!hostedGameClient.value) {
                    return;
                }

                hostedGameClient.value.sendMove(fromEngineMove(move));
            };

            gameView?.previewMove(move, localPlayerIndex as PlayerIndex);
        } catch (e) {
            // noop
        }
    });
};

const initGameView = async () => {
    if (!hostedGameClient.value) {
        throw new Error('Cannot init game view now, no hostedGameClient');
    }

    const game = hostedGameClient.value.loadGame();

    gameView = new CustomizedGameView(game);

    gameViewInitialized.value = true;

    if (null !== playerSettings.value) {
        gameView.updateOptionsFromPlayerSettings(playerSettings.value);
    }

    await gameView.ready();

    // Should be after setDisplayCoords and setPreferredOrientations to start after redraws
    gameView.animateWinningPath();

    watch(playerSettings, settings => {
        if (null === gameView || null === settings) {
            return;
        }

        gameView.setDisplayCoords(settings.showCoords);
        gameView.setPreferredOrientations({
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

const makeTitle = (gameClient: HostedGameClient) => {
    const players = gameClient.getPlayers();
    const { state } = gameClient.getHostedGame();
    const playerPseudos = players.map(p => pseudoString(p, 'pseudo'));
    if (players.length < 2 && 'created' === state)
        return `${i18next.t('game.title_waiting')} ${playerPseudos[0]}`;
    let yourTurn = '';
    if ('playing' === state && loggedInPlayer.value != null) {
        const player = loggedInPlayer.value;
        const index = players.findIndex(p => p.publicId === player.publicId);
        if (index != null && gameClient.getGame().getCurrentPlayerIndex() === index) {
            yourTurn = `• ${i18next.t('game.title_your_turn')} • `;
        }
    }
    const pairing = playerPseudos.join(' VS ');
    return `${yourTurn}${i18next.t('game_state.' + state)}: ${pairing}`;
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

    await initGameView();

    const playerPseudos = hostedGameClient.value.getPlayers().map(p => p.pseudo);
    const { state, host } = hostedGameClient.value.getHostedGame();
    const description = 'created' === state
        ? `Hex game, hosted by ${host.pseudo}, waiting for an opponent.`
        : `Hex game, ${playerPseudos.join(' versus ')}.`
    ;

    useSeoMeta({
        robots: 'noindex',
        title: computed(() => {
            if (hostedGameClient.value == null) return '';
            return makeTitle(hostedGameClient.value);
        }),
        description,
        ogDescription: description,
    });
};

onMounted(() => loadGame());

const join = () => hostedGameClient.value?.sendJoinGame();

const confirmationOverlay = defineOverlay(ConfirmationOverlay);

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
watch(hostedGameClient, game => {
    if (null === game) {
        return;
    }

    game.on('chatMessagePosted', () => {
        if (isSidebarCurrentlyOpen()) {
            game.markAllMessagesRead();
        }
    });

    watch(localSettings, () => {
        if (isSidebarCurrentlyOpen()) {
            game.markAllMessagesRead();
        }
    });
});

const unreadMessages = (): number => {
    if (null === hostedGameClient.value) {
        return 0;
    }

    return hostedGameClient.value.getChatMessages().length
        - hostedGameClient.value.getReadMessages()
    ;
};

/*
 * Rewind mode
 */
const enableRewindMode = () => {
    gameView?.enableRewindMode();
};
</script>

<template>
    <div v-show="gameViewInitialized && null !== hostedGameClient" class="game-and-sidebar-container" :class="localSettings.openSidebar ? 'sidebar-open' : (undefined === localSettings.openSidebar ? 'sidebar-auto' : '')">
        <div class="game">

            <!-- Game board, "Accept" button -->
            <div class="board-container">
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

            <!-- Control buttons at bottom of game board (resign, undo, confirm move, ...) -->
            <nav class="menu-game navbar" v-if="null !== hostedGameClient">
                <div class="buttons container-fluid">

                    <!-- rewind mode -->
                    <button type="button" v-if="null !== gameView" @click="() => enableRewindMode()" class="btn btn-outline-primary">
                        <BIconRewind />
                    </button>

                    <!-- Resign -->
                    <button type="button" class="btn btn-outline-danger" v-if="canResign() && !canCancel()" @click="resign()">
                        <BIconFlag />
                        <span class="d-none d-lg-inline">{{ ' ' + $t('resign') }}</span>
                    </button>

                    <!-- Cancel -->
                    <button type="button" class="btn btn-outline-primary" v-if="canCancel()" @click="cancel()">
                        <BIconXLg />
                        <span class="d-none d-md-inline">{{ ' ' + $t('cancel') }}</span>
                    </button>

                    <!-- Confirm move -->
                    <button type="button" class="btn" v-if="shouldDisplayConfirmMove()" :class="null === confirmMove ? 'btn-outline-secondary' : 'btn-success'" :disabled="null === confirmMove" @click="null !== confirmMove && confirmMove()">
                        <BIconCheck />
                        <span class="d-md-none">{{ ' ' + $t('confirm_move.button_label_short') }}</span>
                        <span class="d-none d-md-inline">{{ ' ' + $t('confirm_move.button_label') }}</span>
                    </button>

                    <!-- Undo -->
                    <button type="button" class="btn btn-primary" v-if="shouldDisplayUndoMove()" @click="askUndo()" :disabled="shouldDisableUndoMove()" :class="{ 'btn-outline-secondary btn-disabled': shouldDisableUndoMove() }">
                        <BIconArrowCounterclockwise />
                        <span class="d-none d-md-inline">{{ $t('undo.undo_move') }}</span>
                    </button>

                    <!-- Undo accept -->
                    <button type="button" class="btn btn-success" v-if="shouldDisplayAnswerUndoMove()" @click="answerUndo(true)">
                        <BIconCheck />
                        <span class="d-none d-md-inline">{{ $t('undo.accept') }}</span>
                    </button>

                    <!-- Undo reject -->
                    <button type="button" class="btn btn-danger" v-if="shouldDisplayAnswerUndoMove()" @click="answerUndo(false)">
                        <BIconX />
                        <span class="d-none d-lg-inline">{{ $t('undo.reject') }}</span>
                    </button>

                    <!-- Rematch -->
                    <button type="button" class="btn btn-outline-primary" v-if="canRematch()" @click="createOrAcceptRematch()">
                        <BIconRepeat />
                        <span class="d-none d-md-inline">{{ ' ' + $t('rematch.label') }}</span>
                    </button>

                    <!-- Accept / View rematch -->
                    <template v-else-if="hostedGameClient.getRematchGameId() != null">
                        <button type="button" class="btn btn-success" v-if="canAcceptRematch" @click="createOrAcceptRematch()">
                            {{ ' ' + $t('rematch.accept') }}
                        </button>
                        <button type="button" class="btn btn-outline-primary" v-else @click="viewRematch()">
                            {{ ' ' + $t('rematch.view') }}
                        </button>
                    </template>

                    <!-- Chat -->
                    <button type="button" class="btn btn-outline-primary position-relative" @click="showSidebar()">
                        <BIconChatRightText v-if="hostedGameClient.getChatMessages().length > 0" />
                        <BIconChatRight v-else />
                        <span class="d-none d-lg-inline">{{ ' ' + $t('chat') }}</span>
                        <span v-if="unreadMessages() > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            {{ unreadMessages() }}
                            <span class="d-none">{{ ' ' + $t('unread_messages') }}</span>
                        </span>
                    </button>

                    <!-- Right button, open sidebar -->
                    <button type="button" class="btn btn-outline-primary open-sidebar-btn" @click="showSidebar()" aria-label="Open game sidebar and chat"><BIconArrowBarLeft /></button>

                </div>
            </nav>
        </div>

        <!-- Game sidebar -->
        <div class="sidebar bg-body" v-if="(hostedGameClient instanceof HostedGameClient)">
            <AppGameSidebar
                :hostedGameClient="hostedGameClient"
                v-if="gameView"
                :gameView="gameView"
                @close="showSidebar(false)"
                @toggleCoords="toggleCoords()"
            />
        </div>
    </div>

    <div v-if="null === hostedGameClient || null === gameView" class="container-fluid my-3">
        <p class="lead text-center">{{ $t('loading_game') }}</p>
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

.game-and-sidebar-container
    position relative
    display flex

    .game
        width 100%

    .sidebar
        display none

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
            width 64%

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
            width 36%

    .open-sidebar-btn
        display none

.sidebar-open
    sidebarOpen()

.sidebar-auto
    @media (min-width: 576px)
        sidebarOpen()
</style>
