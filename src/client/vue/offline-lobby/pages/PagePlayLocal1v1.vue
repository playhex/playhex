<script setup lang="ts">
import { t } from 'i18next';
import { computed, onMounted, onUnmounted, ref, shallowRef, watch, watchEffect } from 'vue';
import { useHead } from '@unhead/vue';
import { defineOverlay } from '@overlastic/vue';
import { AnimatorFacade, GameView } from '@playhex/pixi-board';
import { EngineGame, IllegalMove, PlayerIndex } from '../../../../shared/game-engine/index.js';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';
import AppGameView from '../../components/AppGameView.vue';
import ConfirmationOverlay from '../../components/overlay/ConfirmationOverlay.vue';
import OfflineGameFinishedOverlay from '../overlay/OfflineGameFinishedOverlay.vue';
import AppLocalPlayerBar from '../components/AppLocalPlayerBar.vue';
import AppLocal1v1Menu from '../components/AppLocal1v1Menu.vue';
import AppLocalSimulationControls from '../components/AppLocalSimulationControls.vue';
import { bindLocalBoardDisplay, toggleLocalCoords } from '../services/localBoardDisplay.js';
import { Local1v1Game, Seat } from '../models/Local1v1Game.js';
import { Local1v1GameOptions } from '../models/Local1v1GameOptions.js';
import { offlineGamesStorage } from '../services/OfflineGamesStorage.js';
import { listenLocalGameSounds, playLocalGameSound } from '../services/localGameSounds.js';
import { LocalClock } from '../services/LocalClock.js';
import useAppLayoutStore from '../../../stores/appLayoutStore.js';
import { IconList, IconPlayFill } from '../../icons.js';

useHead({
    title: t('local_play.with_friend'),
});

const DRAW_SOUND = '/sounds/lisp/Draw.ogg';

const localGame = ref<null | Local1v1Game>(null);
const game = shallowRef<null | EngineGame>(null);
const gameView = shallowRef<null | GameView>(null);
const gameViewFacade = shallowRef<null | GameViewFacade>(null);
const clock = shallowRef<null | LocalClock>(null);

/**
 * Options used when restarting a game, edited from menu.
 */
const nextGameOptions = ref(new Local1v1GameOptions());

/**
 * Incremented when game state changes (move, undo, end),
 * to refresh computed values depending on game.
 */
const gameVersion = ref(0);

/**
 * Incremented on new game to remount game view.
 */
const reload = ref(0);

/*
 * Seats and colors
 */
const tabletop = computed(() => localGame.value?.gameOptions.tabletop ?? false);

const colorOfSeat = (seat: Seat): PlayerIndex => seat === localGame.value?.redSeat ? 0 : 1;

/**
 * Players pseudos, indexed by color.
 */
const pseudosByColor = (local: Local1v1Game): [string, string] => [
    local.seats[local.redSeat],
    local.seats[1 - local.redSeat],
];

const defaultNames = (): [string, string] => offlineGamesStorage.getLastLocal1v1Names()
    ?? [t('local_play.player_n', { n: 1 }), t('local_play.player_n', { n: 2 })]
;

/*
 * Header is hidden in tabletop mode
 */
const appLayoutStore = useAppLayoutStore();

watchEffect(() => appLayoutStore.headerHidden = tabletop.value);
onUnmounted(() => appLayoutStore.headerHidden = false);

/*
 * Persistence
 */
const saveGame = (): void => {
    if (!localGame.value || !game.value || game.value.isEnded()) {
        return;
    }

    localGame.value.gameData = game.value.toData();
    localGame.value.timeControlValues = clock.value?.toSnapshot() ?? null;

    offlineGamesStorage.setCurrentLocal1v1Game(localGame.value);
};

watch(() => localGame.value?.seats, saveGame, { deep: true });

/**
 * Keep finished game in history, only if at least one move has been played.
 */
const addToHistory = (local: Local1v1Game, finishedGame: EngineGame): void => {
    if (finishedGame.getMovesHistory().length === 0) {
        return;
    }

    offlineGamesStorage.addToHistory('local1v1', {
        pseudos: pseudosByColor(local),
        gameData: finishedGame.toData(),
        timeoutLoser: local.timeoutLoser,
    });
};

/*
 * Game lifecycle
 */
let disposeGame: null | (() => void) = null;

const gameFinishedOverlay = defineOverlay(OfflineGameFinishedOverlay);

/**
 * A player lost on time: show winner, but let players continue without time.
 */
const onTimeElapsed = async (loser: PlayerIndex): Promise<void> => {
    const local = localGame.value;
    const timedOutGame = game.value;

    if (!local || !timedOutGame || timedOutGame.isEnded()) {
        return;
    }

    local.timeoutLoser = loser;
    playLocalGameSound(DRAW_SOUND);
    saveGame();

    const result = await gameFinishedOverlay({
        game: timedOutGame,
        pseudos: pseudosByColor(local),
        timeoutLoser: loser,
        timeoutOnly: true,
    });

    if (result === 'rematch' && game.value === timedOutGame) {
        rematch();
    }
};

/**
 * Binds view, clock, storage, sounds and end overlay to a game.
 * Clock starts once first move is played.
 *
 * @param reloaded Whether this game is resumed from storage.
 */
const loadGame = (local: Local1v1Game, reloaded: boolean): void => {
    disposeGame?.();

    localGame.value = local;
    nextGameOptions.value = { ...local.gameOptions };

    const newGame = EngineGame.fromData(local.gameData);
    const newGameView = new GameView(newGame.getSize());
    const newGameViewFacade = new GameViewFacade(newGameView, newGame);
    const unbindBoardDisplay = bindLocalBoardDisplay(newGameViewFacade);

    const previousGameView = gameView.value;

    simulating.value = false;
    game.value = newGame;
    gameView.value = newGameView;
    gameViewFacade.value = newGameViewFacade;
    ++reload.value;
    previousGameView?.destroy();

    clock.value = null;

    if (local.gameOptions.timeControl && !newGame.isEnded()) {
        clock.value = new LocalClock(local.gameOptions.timeControl, local.timeControlValues, loser => void onTimeElapsed(loser));
    }

    newGameView.on('hexClicked', move => {
        if (newGame.isEnded() || isPaused.value || newGameViewFacade.isSimulationMode()) {
            return;
        }

        try {
            newGame.move(newGame.moveOrSwapPieces(move), newGame.getCurrentPlayerIndex());
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    newGame.on('played', (_move, _moveIndex, byPlayerIndex) => {
        if (clock.value?.isReady()) {
            clock.value.startFor(newGame.getCurrentPlayerIndex());
        } else {
            clock.value?.push(byPlayerIndex);
        }

        saveGame();
    });

    newGame.on('undo', () => {
        clock.value?.switchTo(newGame.getCurrentPlayerIndex());
        saveGame();
    });

    newGame.on('ended', () => {
        exitSimulation();
        clock.value?.finish();
        offlineGamesStorage.clearCurrentLocal1v1Game();
        addToHistory(local, newGame);
    });

    for (const event of ['played', 'undo', 'ended'] as const) {
        newGame.on(event, () => ++gameVersion.value);
    }

    // Always same neutral sound on game end, no winner or loser between friends
    const disposeSounds = listenLocalGameSounds(newGame, () => DRAW_SOUND);

    let disposed = false;

    const endedCallback = async () => {
        const winningPath = newGame.getBoard().getShortestWinningPath();

        if (winningPath) {
            await new AnimatorFacade(newGameView).animatePath(winningPath);
        }

        if (disposed) return;

        const result = await gameFinishedOverlay({
            game: newGame,
            pseudos: pseudosByColor(local),
            timeoutLoser: local.timeoutLoser,
        });

        if (result === 'rematch' && !disposed) {
            rematch();
        }
    };

    newGame.on('ended', endedCallback);

    disposeGame = () => {
        disposed = true;
        disposeSounds();
        unbindBoardDisplay();
        newGame.off('ended', endedCallback);
        clock.value?.pause();
    };

    ++gameVersion.value;
    timeoutBannerDismissed.value = false;

    if (!reloaded) {
        saveGame();
    }
};

const startNewGame = (gameOptions: Local1v1GameOptions, seats: [string, string], redSeat: Seat): void => {
    const newGame = new EngineGame(gameOptions.boardsize);

    newGame.setAllowSwap(gameOptions.swapRule);

    const local = new Local1v1Game();

    local.gameOptions = { ...gameOptions };
    local.seats = [...seats];
    local.redSeat = redSeat;
    local.gameData = newGame.toData();

    loadGame(local, false);
};

const init = (): void => {
    // Players started a new game from lobby
    if (history.state.gameOptions && !history.state.alreadyCreated) {
        startNewGame(JSON.parse(history.state.gameOptions), defaultNames(), 0);

        // Persist in history state, so that a page refresh continues this game instead of creating a new one
        history.replaceState({ ...history.state, alreadyCreated: true }, '');
        return;
    }

    // Players continue current game
    const currentGame = offlineGamesStorage.getCurrentLocal1v1Game();

    if (currentGame) {
        loadGame(currentGame, true);
        return;
    }

    startNewGame(new Local1v1GameOptions(), defaultNames(), 0);
};

/**
 * New game with swapped colors, players keep their seat.
 */
const rematch = (): void => {
    if (!localGame.value) {
        return;
    }

    // Game lost on time but not finished on board: keep it in history anyway
    if (game.value && !game.value.isEnded() && localGame.value.timeoutLoser !== null) {
        addToHistory(localGame.value, game.value);
    }

    startNewGame(
        { ...nextGameOptions.value, tabletop: tabletop.value },
        localGame.value.seats,
        1 - localGame.value.redSeat as Seat,
    );
};

const restart = (): void => {
    if (!localGame.value) {
        return;
    }

    menuOpen.value = false;

    startNewGame(
        { ...nextGameOptions.value, tabletop: tabletop.value },
        localGame.value.seats,
        localGame.value.redSeat,
    );
};

const confirmationOverlay = defineOverlay(ConfirmationOverlay);

const swapColors = async (): Promise<void> => {
    if (!localGame.value || !game.value) {
        return;
    }

    if (game.value.getMovesHistory().length > 0 && !game.value.isEnded()) {
        try {
            await confirmationOverlay({
                title: t('local_play.swap_colors'),
                message: t('local_play.swap_colors_confirm'),
            });
        } catch (e) {
            return;
        }
    }

    menuOpen.value = false;
    rematch();
};

const setTabletop = (value: boolean): void => {
    if (!localGame.value) {
        return;
    }

    localGame.value.gameOptions.tabletop = value;
    nextGameOptions.value.tabletop = value;
    closeMenu();
    saveGame();
};

/*
 * Simulation mode
 */
const simulating = ref(false);

const enterSimulation = (): void => {
    if (!gameViewFacade.value) {
        return;
    }

    gameViewFacade.value.enableSimulationMode();
    simulating.value = true;
    closeMenu();
};

const exitSimulation = (): void => {
    gameViewFacade.value?.disableSimulationMode();
    simulating.value = false;
};

const toggleCoords = (): void => {
    if (gameViewFacade.value) {
        toggleLocalCoords(gameViewFacade.value);
    }
};

/*
 * Clock pause
 */
const clockState = computed(() => clock.value?.values.value?.state ?? null);

const isPaused = computed(() => clockState.value === 'paused');

const menuOpen = ref(false);
let resumeOnMenuClose = false;

const openMenu = (): void => {
    resumeOnMenuClose = clock.value?.isRunning() ?? false;
    clock.value?.pause();
    menuOpen.value = true;
};

const closeMenu = (): void => {
    menuOpen.value = false;

    if (resumeOnMenuClose) {
        clock.value?.resume();
    }

    resumeOnMenuClose = false;
};

const resume = (): void => clock.value?.resume();

const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
        clock.value?.pause();
        saveGame();
    }
};

onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange));

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    saveGame();

    // Do not keep a game without any move, nothing to continue
    if (game.value && game.value.getMovesHistory().length === 0) {
        offlineGamesStorage.clearCurrentLocal1v1Game();
    }

    disposeGame?.();
    gameView.value?.destroy();
});

/*
 * Player bars: pass, undo, chrono
 */
const timeValueOfSeat = (seat: Seat) => clock.value?.values.value?.players[colorOfSeat(seat)].totalRemainingTime ?? null;

const isCurrentSeat = (seat: Seat): boolean => {
    void gameVersion.value;

    return game.value !== null
        && !game.value.isEnded()
        && game.value.getCurrentPlayerIndex() === colorOfSeat(seat)
    ;
};

const canPass = (seat: Seat): boolean => isCurrentSeat(seat) && !isPaused.value && !simulating.value;

const canRematch = computed((): boolean => {
    void gameVersion.value;

    if (game.value === null || simulating.value) {
        return false;
    }

    return game.value.isEnded() || localGame.value?.timeoutLoser != null;
});

const canResign = computed((): boolean => {
    void gameVersion.value;

    // Already lost on time, no reason to resign
    if (localGame.value?.timeoutLoser != null) {
        return false;
    }

    return game.value !== null && !game.value.isEnded() && !isPaused.value && !simulating.value;
});

const resign = async (seat: Seat): Promise<void> => {
    if (!game.value || !canResign.value) {
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
    } catch (e) {
        return;
    }

    if (!game.value.isEnded()) {
        game.value.resign(colorOfSeat(seat), new Date());
    }
};

/**
 * Only the player who just played can take back his move.
 */
const canUndo = (seat: Seat): boolean => {
    void gameVersion.value;

    if (!game.value || game.value.isEnded() || isPaused.value || simulating.value) {
        return false;
    }

    const movesCount = game.value.getMovesHistory().length;

    return movesCount > 0 && (movesCount - 1) % 2 === colorOfSeat(seat);
};

const pass = (seat: Seat): void => {
    if (!game.value || !canPass(seat)) {
        return;
    }

    game.value.pass(colorOfSeat(seat));
};

const undo = (seat: Seat): void => {
    if (!game.value || !canUndo(seat)) {
        return;
    }

    game.value.undoMove();
};

/**
 * Winner on time, when game continues after a player timed out.
 */
const timeoutBannerDismissed = ref(false);

const timeoutWinnerName = computed((): null | string => {
    void gameVersion.value;

    if (timeoutBannerDismissed.value || !localGame.value || localGame.value.timeoutLoser === null || game.value?.isEnded()) {
        return null;
    }

    return pseudosByColor(localGame.value)[1 - localGame.value.timeoutLoser];
});

init();
</script>

<template>
    <div v-if="localGame" class="local-1v1 bg-body" :class="{ tabletop }">
        <AppLocalPlayerBar
            v-model:name="localGame.seats[1]"
            :playerIndex="colorOfSeat(1)"
            :isCurrent="isCurrentSeat(1)"
            :flipped="tabletop"
            :timeValue="timeValueOfSeat(1)"
            :canPass="canPass(1)"
            :canUndo="canUndo(1)"
            :canResign
            @pass="pass(1)"
            @undo="undo(1)"
            :canRematch
            @resign="resign(1)"
            @rematch="rematch"
        />

        <div class="board-area">
            <AppGameView
                v-if="gameView"
                :key="reload"
                :gameView
                class="board"
            />

            <template v-if="timeoutWinnerName">
                <div
                    v-for="position in (tabletop ? ['top', 'bottom'] : ['bottom'])"
                    :key="position"
                    class="timeout-banner alert alert-warning py-1 px-2"
                    :class="position"
                >
                    {{ $t('local_play.x_wins_on_time_continue', { player: timeoutWinnerName }) }}
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-warning ms-2"
                        @click="timeoutBannerDismissed = true"
                    >{{ $t('close') }}</button>
                </div>
            </template>

            <div v-if="isPaused && !menuOpen" class="paused-overlay">
                <button type="button" class="btn btn-lg btn-success" @click="resume">
                    <IconPlayFill /> {{ $t('local_play.resume_game') }}
                </button>
            </div>
        </div>

        <AppLocalSimulationControls
            v-if="simulating && gameViewFacade"
            :gameViewFacade
            @close="exitSimulation"
        />

        <AppLocalPlayerBar
            v-model:name="localGame.seats[0]"
            :playerIndex="colorOfSeat(0)"
            :isCurrent="isCurrentSeat(0)"
            :timeValue="timeValueOfSeat(0)"
            :canPass="canPass(0)"
            :canUndo="canUndo(0)"
            :canResign
            @pass="pass(0)"
            @undo="undo(0)"
            :canRematch
            @resign="resign(0)"
            @rematch="rematch"
        />

        <button
            type="button"
            class="menu-bubble btn btn-primary"
            :aria-label="$t('local_play.menu')"
            @click="openMenu"
        ><IconList /></button>

        <AppLocal1v1Menu
            v-if="menuOpen && game"
            v-model:nextGameOptions="nextGameOptions"
            :tabletop
            :game
            :pseudos="pseudosByColor(localGame)"
            :orientation="gameView?.getOrientation()"
            @close="closeMenu"
            @setTabletop="setTabletop"
            @swapColors="swapColors"
            @restart="restart"
            @toggleCoords="toggleCoords"
            @simulation="enterSimulation"
        />
    </div>
</template>

<style lang="stylus" scoped>
.local-1v1
    display flex
    flex-direction column
    height calc(100vh - 3rem)
    height calc(100dvh - 3rem)
    overflow hidden

    &.tabletop
        height 100vh
        height 100dvh

.board-area
    position relative
    flex 1
    min-height 0

    .board
        position absolute
        inset 0

.timeout-banner
    position absolute
    left 50%
    margin 0.25em 0
    max-width 90%
    display flex
    align-items center
    text-align center

    &.bottom
        bottom 0
        transform translateX(-50%)

    &.top
        top 0
        transform translateX(-50%) rotate(180deg)

.paused-overlay
    position absolute
    inset 0
    display flex
    justify-content center
    align-items center
    background rgba(0, 0, 0, 0.35)

.menu-bubble
    // Round bubble slightly out of the screen
    position fixed
    right -1.25rem
    // First quarter from top, to not overlap board
    top 25%
    transform translateY(-50%)
    width 3.5rem
    height 3.5rem
    border-radius 50%
    padding 0 1.25rem 0 0
    font-size 1.25rem
    box-shadow 0 0 0.5rem rgba(0, 0, 0, 0.3)
    opacity 0.8
    z-index 10

    &:hover, &:focus
        opacity 1
</style>
