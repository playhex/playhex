<script setup lang="ts">
import { t } from 'i18next';
import { computed, Ref, ref, shallowRef, onUnmounted } from 'vue';
import { EngineGame, IllegalMove, PlayerIndex } from '../../../../shared/game-engine/index.js';
import { Player } from '../../../../shared/app/models/index.js';
import { OfflineAIGameOptions } from '../models/OfflineAIGameOptions.js';
import { findLocalAIByName, instanciateAi } from '../localAi.js';
import { defineOverlay } from '@overlastic/vue';
import OfflineGameFinishedOverlay from '../overlay/OfflineGameFinishedOverlay.vue';
import { AnimatorFacade, GameView } from '@playhex/pixi-board';
import { OfflineGame } from '../models/OfflineGame.js';
import { offlineGamesStorage } from '../services/OfflineGamesStorage.js';
import { listenLocalGameSounds } from '../services/localGameSounds.js';
import { bindLocalBoardDisplay } from '../services/localBoardDisplay.js';
import AppLocalSimulationControls from '../components/AppLocalSimulationControls.vue';
import ConfirmationOverlay from '../../components/overlay/ConfirmationOverlay.vue';
import { IconArrowClockwise, IconArrowCounterclockwise, IconArrowLeft, IconFlag, IconRewind } from '../../icons.js';
import type { HexMove } from '@playhex/move-notation';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';
import AppGameView from '../../components/AppGameView.vue';
import { useHead } from '@unhead/vue';

useHead({
    title: t('local_play.vs_computer'),
});

const game = shallowRef<EngineGame | null>(null);
const gameView = shallowRef<GameView | null>(null);
const gameViewFacade = shallowRef<null | GameViewFacade>(null);
let lastGameOptions: OfflineAIGameOptions;
let calculateMove: (game: EngineGame) => Promise<HexMove>;

const players: Ref<Player[]> = ref([]);
const humanIndex = ref<PlayerIndex>(0);

/**
 * Incremented when game state changes (move, undo, end),
 * to refresh computed values depending on game.
 */
const gameVersion = ref(0);

const aiThinking = ref(false);

const init = (): void => {
    // Player started a new game
    if (history.state.gameOptions && !history.state.alreadyCreated) {
        initGameFromGameOptions(JSON.parse(history.state.gameOptions));

        // Persist in history state, so that a page refresh continues this game instead of creating a new one
        history.replaceState({ ...history.state, alreadyCreated: true }, '');
        return;
    }

    // Player continues current game
    const currentGame = offlineGamesStorage.getCurrentAIGame();

    if (currentGame) {
        reloadCurrentGame(currentGame);
        return;
    }

    // Unsure, create a new game, default settings
    initGameFromGameOptions(new OfflineAIGameOptions());
};

const makeAIMoveIfApplicable = async (game: EngineGame, players: Player[]): Promise<void> => {
    const player = players[game.getCurrentPlayerIndex()];

    if (!player.isBot || game.isEnded()) {
        return;
    }

    const movesCount = game.getMovesHistory().length;

    aiThinking.value = true;

    try {
        const move = await calculateMove(game);

        // Position changed while AI was thinking (restart, ...): ignore this move
        if (game !== gameViewFacade.value?.getGame() || game.getMovesHistory().length !== movesCount || game.isEnded()) {
            return;
        }

        game.move(move, game.getCurrentPlayerIndex());
    } finally {
        aiThinking.value = false;
    }
};

const offlinePlayer: Player = {
    publicId: 'offline-player',
    isBot: false,
    pseudo: t('player'),
    isGuest: false,
    createdAt: new Date(),
    slug: '',
};

const saveGame = (gameOptions: OfflineAIGameOptions): void => {
    if (!game.value || game.value.isEnded()) {
        return;
    }

    const currentGame = new OfflineGame();

    currentGame.gameOptions = gameOptions;
    currentGame.players = players.value.map(p => {
        p.currentRating = undefined;
        return p;
    });
    currentGame.gameData = game.value.toData();

    offlineGamesStorage.setCurrentAIGame(currentGame);
};

let disposeSounds: null | (() => void) = null;
let unbindBoardDisplay: null | (() => void) = null;

/**
 * Binds view, AI, storage, sounds and end overlay to a new or reloaded game.
 */
const setupGame = (newGame: EngineGame, gameOptions: OfflineAIGameOptions): void => {
    lastGameOptions = gameOptions;
    calculateMove = instanciateAi(findLocalAIByName(gameOptions.ai));
    humanIndex.value = players.value.findIndex(p => !p.isBot) as PlayerIndex;

    game.value = newGame;
    gameView.value = new GameView(newGame.getSize());
    gameViewFacade.value = new GameViewFacade(gameView.value, newGame);
    simulating.value = false;

    unbindBoardDisplay?.();
    unbindBoardDisplay = bindLocalBoardDisplay(gameViewFacade.value);

    const newGameViewFacade = gameViewFacade.value;

    gameView.value.on('hexClicked', move => {
        if (aiThinking.value || newGameViewFacade.isSimulationMode()) {
            return;
        }

        try {
            newGame.move(newGame.moveOrSwapPieces(move), humanIndex.value);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    newGame.on('played', () => void makeAIMoveIfApplicable(newGame, players.value));
    newGame.on('played', () => saveGame(gameOptions));
    newGame.on('undo', () => saveGame(gameOptions));

    newGame.on('ended', () => {
        exitSimulation();
        offlineGamesStorage.clearCurrentAIGame();

        // Do not keep games ended without any move, i.e resigned at start
        if (newGame.getMovesHistory().length > 0) {
            offlineGamesStorage.addToHistory('ai', {
                pseudos: [players.value[0].pseudo, players.value[1].pseudo],
                gameData: newGame.toData(),
            });
        }
    });

    for (const event of ['played', 'undo', 'ended'] as const) {
        newGame.on(event, () => ++gameVersion.value);
    }

    disposeSounds?.();
    disposeSounds = listenLocalGameSounds(newGame, () => newGame.getWinner() === humanIndex.value
        ? '/sounds/lisp/Victory.ogg'
        : '/sounds/lisp/Defeat.ogg',
    );

    initWinOverlay(newGame, gameView.value);

    ++gameVersion.value;

    void makeAIMoveIfApplicable(newGame, players.value);
};

const initGameFromGameOptions = (gameOptions: OfflineAIGameOptions) => {
    const localAI = findLocalAIByName(gameOptions.ai);

    players.value = [
        offlinePlayer,
        {
            isBot: true,
            isGuest: false,
            pseudo: localAI.label,
            slug: '',
            publicId: localAI.name,
            createdAt: new Date(),
        },
    ];

    if (gameOptions.firstPlayer === null) {
        if (Math.random() < 0.5) {
            players.value.reverse();
        }
    } else if (gameOptions.firstPlayer === 1) {
        players.value.reverse();
    }

    const newGame = new EngineGame(gameOptions.boardsize);

    newGame.setAllowSwap(gameOptions.swapRule);

    setupGame(newGame, gameOptions);
    saveGame(gameOptions);
};

const reloadCurrentGame = (currentGame: OfflineGame) => {
    players.value = currentGame.players;

    setupGame(EngineGame.fromData(currentGame.gameData), currentGame.gameOptions);
};

/*
 * Simulation mode
 */
const simulating = ref(false);

const enterSimulation = (): void => {
    gameViewFacade.value?.enableSimulationMode();
    simulating.value = gameViewFacade.value !== null;
};

const exitSimulation = (): void => {
    gameViewFacade.value?.disableSimulationMode();
    simulating.value = false;
};

/*
 * Pass, undo, resign
 */
const canPass = computed((): boolean => {
    void gameVersion.value;

    return game.value !== null
        && !game.value.isEnded()
        && !aiThinking.value
        && !simulating.value
        && game.value.getCurrentPlayerIndex() === humanIndex.value
    ;
});

const pass = (): void => {
    if (!game.value || !canPass.value) {
        return;
    }

    game.value.pass(humanIndex.value);
};

const canUndo = computed((): boolean => {
    void gameVersion.value;

    return game.value !== null
        && !aiThinking.value
        && !simulating.value
        && game.value.canPlayerUndo(humanIndex.value) === true
    ;
});

const undo = (): void => {
    if (!game.value || !canUndo.value) {
        return;
    }

    game.value.playerUndo(humanIndex.value);
};

const canResign = computed((): boolean => {
    void gameVersion.value;

    return game.value !== null && !game.value.isEnded() && !simulating.value;
});

const confirmationOverlay = defineOverlay(ConfirmationOverlay);

const resign = async (): Promise<void> => {
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
        game.value.resign(humanIndex.value, new Date());
    }
};

/*
 * Game end: win popin
 */
const gameFinishedOverlay = defineOverlay(OfflineGameFinishedOverlay);

let disposeWinOverlay: null | (() => void) = null;

const initWinOverlay = (game: EngineGame, gameView: GameView) => {
    disposeWinOverlay?.();

    let disposed = false;

    const endedCallback = async () => {
        if (disposed) return;

        const winningPath = game.getBoard().getShortestWinningPath();

        if (winningPath) {
            const animatorFacade = new AnimatorFacade(gameView);
            await animatorFacade.animatePath(winningPath);

            if (disposed) return;
        }

        const result = await gameFinishedOverlay({
            game,
            pseudos: [players.value[0].pseudo, players.value[1].pseudo],
        });

        if (result === 'rematch' && !disposed) {
            rematch();
        }
    };

    game.on('ended', endedCallback);
    game.on('canceled', endedCallback);

    disposeWinOverlay = () => {
        disposed = true;
        game.off('ended', endedCallback);
        game.off('canceled', endedCallback);
    };
};

onUnmounted(() => {
    // Do not keep a game without any move, nothing to continue
    if (game.value && !game.value.isEnded() && game.value.getMovesHistory().length === 0) {
        offlineGamesStorage.clearCurrentAIGame();
    }

    disposeWinOverlay?.();
    disposeSounds?.();
    unbindBoardDisplay?.();
});

init();

/*
 * Rematch
 */
const reload = ref(0);

const rematch = () => {
    initGameFromGameOptions(lastGameOptions);
    ++reload.value;
};
</script>

<template>
    <div class="bg-body">
        <AppGameView
            v-if="gameView"
            :key="reload"
            :gameView
            class="offline-board-container"
        />

        <AppLocalSimulationControls
            v-if="simulating && gameViewFacade"
            :gameViewFacade
            @close="exitSimulation"
        />

        <div v-else class="game-menu">
            <router-link class="btn btn-outline-primary" :to="{ name: 'offline-lobby' }" :title="$t('back_to_menu')">
                <IconArrowLeft /><span class="hide-sm">{{ ' ' + $t('back_to_menu') }}</span>
            </router-link>
            <button type="button" class="btn btn-outline-primary" :title="$t('local_play.simulation')" @click="enterSimulation">
                <IconRewind />
            </button>
            <button type="button" class="btn btn-warning" :disabled="!canUndo" @click="undo">
                <IconArrowCounterclockwise /><span class="hide-sm">{{ ' ' + $t('undo.undo_move') }}</span>
            </button>
            <button type="button" class="btn btn-primary" :disabled="!canPass" @click="pass">{{ $t('pass') }}</button>
            <button type="button" class="btn btn-outline-danger" :disabled="!canResign" :title="$t('resign')" @click="resign">
                <IconFlag /><span class="hide-sm">{{ ' ' + $t('resign') }}</span>
            </button>
            <button type="button" class="btn btn-outline-warning" :title="$t('restart')" @click="rematch">
                <IconArrowClockwise /><span class="hide-sm">{{ ' ' + $t('restart') }}</span>
            </button>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.offline-board-container
    position relative
    width 100vw
    height calc(100vh - 6rem)
    height calc(100dvh - 6rem)
    overflow hidden

    // Mobile UI fix: add margin at bottom if url bar is present,
    // so it is possible to scroll to hide url bar and set full height again,
    // then the UI will fit 100vh again.
    margin-bottom calc(100lvh - 100dvh)

.game-menu
    height 3rem
    display flex
    justify-content center
    align-items center
    gap 0.5em

.hide-sm
    @media (max-width: 575px)
        display none
</style>
