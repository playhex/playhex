<script setup lang="ts">
import 'bootstrap/js/dist/dropdown.js';
import useLobbyStore from '../../stores/lobbyStore.js';
import { ref, computed } from 'vue';
import AppBoard from '../components/AppBoard.vue';
import ConfirmationOverlay from '../components/overlay/ConfirmationOverlay.vue';
import { defineOverlay } from '@overlastic/vue';
import { Ref, watch, watchEffect } from 'vue';
import useAuthStore from '../../stores/authStore.js';
import { useRoute, useRouter } from 'vue-router';
import { IconFlag, IconXLg, IconCheck, IconArrowBarLeft, IconRepeat, IconArrowCounterclockwise, IconX, IconRewind, IconList, IconArrowDownUp, IconSignpostSplit } from '../icons.js';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';
import { storeToRefs } from 'pinia';
import { t } from 'i18next';
import { injectHead, useSeoMeta } from '@unhead/vue';
import AppGameSidebar from '../components/AppGameSidebar.vue';
import AppConnectionAlert from '../components/AppConnectionAlert.vue';
import { HostedGame } from '../../../shared/app/models/index.js';
import { pseudoString } from '../../../shared/app/pseudoUtils.js';
import { apiPostRematch } from '../../apiClient.js';
import { canJoin, getPlayers, shouldShowConditionalMoves } from '../../../shared/app/hostedGameUtils.js';
import { useGuestJoiningCorrespondenceWarning } from '../composables/guestJoiningCorrespondenceWarning.js';
import useCurrentGameStore from '../../stores/currentGameStore.js';
import { useGameViewOrientation } from '../composables/useGameViewOrientation.js';
import AppHexWorldExplore from '../components/AppHexWorldExplore.vue';
import { useWinOverlay } from '../composables/useWinOverlay.js';
import GameFinishedOverlay from '../components/overlay/GameFinishedOverlay.vue';

const head = injectHead();

const { gameId } = useRoute().params;

if (Array.isArray(gameId)) {
    throw new Error('unexpected array param in gameId');
}

const {
    game,
    hostedGame,
    gameView,

    players,
    localPlayerIndex,
    shouldDisplayConfirmMove,
    confirmMove,
    canCancel,
    shouldDisplayAnswerUndoMove,
    shouldDisplayUndoMove,
    shouldEnableUndoMove,
    canResign,
    canRematch,
    shouldShowPass,
    shouldEnablePass,
    unreadMessages,
    isReadingChatMessages,
} = storeToRefs(useCurrentGameStore());

const {
    useGame,

    askUndo,
    answerUndo,
    sendPass,
    sendResign,
    sendCancel,
    enableSimulationMode,
    startConditionalMoves,
} = useCurrentGameStore();

const lobbyStore = useLobbyStore();
const { loggedInPlayer } = storeToRefs(useAuthStore());

const router = useRouter();
const orientation = useGameViewOrientation(gameView);

/*
 * Confirm move
 */
const { localSettings } = usePlayerLocalSettingsStore();

useGame(gameId);

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
 * Set page title and seo fields
 */
watch(hostedGame, hostedGame => {
    if (!hostedGame) {
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

/*
 * Rematch
 */
const canAcceptRematch: Ref<boolean> = ref(false);
const rematchRequestOngoing = ref(false);

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

    try {
        rematchRequestOngoing.value = true;

        if (rematchId != null) {
            hostedGameRematch = await lobbyStore.getOrFetchHostedGame(rematchId);

            if (hostedGameRematch == null) {
                throw new Error('A rematch game does not exist');
            }
        } else {
            hostedGameRematch = await apiPostRematch(hostedGame.value.publicId);
        }
    } finally {
        rematchRequestOngoing.value = false;
    }

    if (canJoin(hostedGameRematch, loggedInPlayer.value)) {
        await lobbyStore.joinGame(hostedGameRematch.publicId);
    }

    await router.push({
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

const isSidebarCurrentlyOpen = computed<boolean>(() => {
    if (undefined !== localSettings.openSidebar) {
        return localSettings.openSidebar;
    }

    return window.screen.width >= 576;
});

watch(isSidebarCurrentlyOpen, () => {
    isReadingChatMessages.value = isSidebarCurrentlyOpen.value;
}, {
    immediate: true,
});

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
 * Win animation and overlay
 */
const gameFinishedOverlay = defineOverlay(GameFinishedOverlay);

watch([gameView, game], () => {
    if (!gameView.value || !game.value) {
        return;
    }

    useWinOverlay(gameView.value, game.value, async () => {
        if (!hostedGame.value || !game.value) {
            return;
        }

        await gameFinishedOverlay({
            game: game.value,
            players: hostedGame.value.hostedGameToPlayers
                .map(hostedGameToPlayer => hostedGameToPlayer.player)
            ,
        });
    });
}, { immediate: true });

/*
 * Warning when guest joining correspondence game
 */
const {
    createGuestJoiningCorrepondenceWarningOverlay,
    isGuestJoiningCorrepondence,
} = useGuestJoiningCorrespondenceWarning();
</script>

<template>
    <div v-show="hostedGame" class="game-and-sidebar-container" :class="localSettings.openSidebar ? 'sidebar-open' : (undefined === localSettings.openSidebar ? 'sidebar-auto' : 'sidebar-closed')">
        <div class="game bg-body">

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
                    <button type="button" v-if="loggedInPlayer && shouldShowConditionalMoves(hostedGame, loggedInPlayer)" @click="startConditionalMoves()" class="btn btn-outline-primary">
                        <IconSignpostSplit />
                    </button>

                    <!-- Resign -->
                    <button type="button" class="btn btn-outline-danger" v-if="canResign && !canCancel" @click="resign()">
                        <IconFlag />
                        <span class="hide-sm">{{ ' ' + $t('resign') }}</span>
                    </button>

                    <!-- Cancel -->
                    <button type="button" class="btn btn-outline-warning" v-if="canCancel" @click="cancel()">
                        <IconXLg />
                        <span class="hide-sm">{{ ' ' + $t('cancel') }}</span>
                    </button>

                    <!-- Confirm move -->
                    <button
                        v-if="shouldDisplayConfirmMove"
                        :class="confirmMove ? 'btn-success' : 'btn-outline-secondary'"
                        :disabled="!confirmMove"
                        @click="confirmMove && confirmMove()"
                        type="button"
                        class="btn"
                    >
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
                    <button type="button" class="btn btn-outline-primary" v-if="canRematch" @click="createOrAcceptRematch()" :disabled="rematchRequestOngoing">
                        <IconRepeat />
                        <span class="hide-sm">{{ ' ' + $t('rematch.label') }}</span>
                    </button>

                    <!-- Accept / View rematch -->
                    <template v-else-if="hostedGame.rematch?.publicId">
                        <button v-if="canAcceptRematch" type="button" class="btn btn-success" @click="createOrAcceptRematch()" :disabled="rematchRequestOngoing">
                            {{ ' ' + $t('rematch.accept') }}
                        </button>
                        <router-link v-else :to="{ name: 'online-game', params: { gameId: hostedGame.rematch.publicId } }" class="btn btn-outline-primary">
                            {{ ' ' + $t('rematch.view') }}
                        </router-link>
                    </template>

                    <!-- Right button, open sidebar -->
                    <button type="button" class="btn btn-outline-primary open-sidebar-btn" @click="showSidebar()" aria-label="Open game sidebar and chat">
                        <IconArrowBarLeft />
                        <span v-if="unreadMessages > 0" class="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-danger">
                            {{ unreadMessages }}
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
                                :class="shouldEnableUndoMove ? 'text-primary' : 'disabled'"
                                :disabled="!shouldEnableUndoMove"
                                @click="askUndo()"
                            >
                                <IconArrowCounterclockwise />
                                {{ $t('undo.undo_move') }}
                            </button>

                            <div><hr class="dropdown-divider"></div>

                            <!-- Explore -->
                            <AppHexWorldExplore
                                v-if="game"
                                :hostedGame
                                :game
                                :orientation
                                :label="$t('explore')"
                                class="dropdown-item"
                            />
                        </div>
                    </div>

                </div>
            </nav>
        </div>

        <!-- Game sidebar -->
        <div class="sidebar bg-body" v-if="hostedGame && gameView">
            <AppGameSidebar
                :hostedGame
                :gameView
                @close="showSidebar(false)"
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
