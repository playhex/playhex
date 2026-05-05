<script setup lang="ts">
import { t } from 'i18next';
import { Ref, ref, shallowRef, onUnmounted } from 'vue';
import { Game, IllegalMove, PlayerIndex } from '../../../../shared/game-engine/index.js';
import { Player } from '../../../../shared/app/models/index.js';
import { OfflineAIGameOptions } from '../models/OfflineAIGameOptions.js';
import { findLocalAIByName, instanciateAi } from '../localAi.js';
import { defineOverlay } from '@overlastic/vue';
import OfflineGameFinishedOverlay from '../overlay/OfflineGameFinishedOverlay.vue';
import GameView from '../../../../shared/pixi-board/GameView.js';
import { OfflineGame } from '../models/OfflineGame.js';
import { offlineGamesStorage } from '../services/OfflineGamesStorage.js';
import type { HexMove } from '../../../../shared/move-notation/hex-move-notation.js';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';
import AppGameView from '../../components/AppGameView.vue';
import { useHead } from '@unhead/vue';
import { AnimatorFacade } from '../../../../shared/pixi-board/facades/AnimatorFacade.js';

useHead({
    title: t('play_offline'),
});

const game = shallowRef<Game | null>(null);
const gameView = shallowRef<GameView | null>(null);
let gameViewFacade = shallowRef<null | GameViewFacade>(null);
let lastGameOptions: OfflineAIGameOptions;
let calculateMove: (game: Game) => Promise<HexMove>;

const init = (): void => {
    // Player started a new game
    if (history.state.gameOptions && !history.state.alreadyCreated) {
        initGameFromGameOptions(JSON.parse(history.state.gameOptions));
        history.state.alreadyCreated = true;
        return;
    }

    // Player continues current game
    const currentGame = offlineGamesStorage.getCurrentGame();

    if (currentGame) {
        reloadCurrentGame(currentGame);
        return;
    }

    // Unsure, create a new game, default settings
    initGameFromGameOptions(new OfflineAIGameOptions());
};

const players: Ref<Player[]> = ref([]);

const makeAIMoveIfApplicable = async (game: Game, players: Player[]): Promise<void> => {
    const player = players[game.getCurrentPlayerIndex()];

    if (!player.isBot || game.isEnded()) {
        return;
    }

    const move = await calculateMove(game);

    game.move(move, game.getCurrentPlayerIndex());
};

const offlinePlayer: Player = {
    publicId: 'offline-player',
    isBot: false,
    pseudo: t('player'),
    isGuest: false,
    createdAt: new Date(),
    slug: '',
};

const initGameFromGameOptions = (gameOptions: OfflineAIGameOptions) => {
    lastGameOptions = gameOptions;
    const player: Player = offlinePlayer;
    const localAI = findLocalAIByName(gameOptions.ai);
    calculateMove = instanciateAi(localAI);

    players.value = [
        player,
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

    const playerIndex = players.value.findIndex(p => !p.isBot);

    game.value = new Game(gameOptions.boardsize);

    game.value.setAllowSwap(gameOptions.swapRule);

    gameView.value = new GameView(game.value.getSize());
    gameViewFacade.value = new GameViewFacade(gameView.value, game.value);

    gameView.value.on('hexClicked', move => {
        if (!game.value) {
            return;
        }

        const hexMove = game.value.moveOrSwapPieces(move);

        try {
            game.value.move(hexMove, playerIndex as PlayerIndex);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    const saveGame = () => {
        if (!game.value) {
            return;
        }

        const currentGame = new OfflineGame();

        currentGame.gameOptions = gameOptions;
        currentGame.players = players.value.map(p => {
            p.currentRating = undefined;
            return p;
        });
        currentGame.gameData = game.value.toData();

        offlineGamesStorage.setCurrentGame(currentGame);
    };

    void makeAIMoveIfApplicable(game.value, players.value);
    game.value.on('played', () => game.value && makeAIMoveIfApplicable(game.value, players.value));
    game.value.on('played', () => saveGame());
    game.value.on('ended', () => offlineGamesStorage.clearCurrentGame());

    saveGame();

    initWinOverlay(game.value, gameView.value);
};

const reloadCurrentGame = (currentGame: OfflineGame) => {
    lastGameOptions = currentGame.gameOptions;
    players.value = currentGame.players;
    const localAI = findLocalAIByName(currentGame.gameOptions.ai);
    calculateMove = instanciateAi(localAI);

    const playerIndex = players.value.findIndex(p => !p.isBot);

    game.value = Game.fromData(currentGame.gameData);

    gameView.value = new GameView(game.value.getSize());
    gameViewFacade.value = new GameViewFacade(gameView.value, game.value);

    gameView.value.on('hexClicked', move => {
        if (!game.value) {
            return;
        }

        const hexMove = game.value.moveOrSwapPieces(move);

        try {
            game.value.move(hexMove, playerIndex as PlayerIndex);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    void makeAIMoveIfApplicable(game.value, players.value);
    game.value.on('played', () => game.value && makeAIMoveIfApplicable(game.value, players.value));
    game.value.on('played', () => {
        if (!game.value) {
            return;
        }

        const nextCurrentGame = new OfflineGame();

        nextCurrentGame.gameOptions = currentGame.gameOptions;
        nextCurrentGame.players = players.value.map(p => {
            p.currentRating = undefined;
            return p;
        });

        nextCurrentGame.gameData = game.value.toData();

        offlineGamesStorage.setCurrentGame(nextCurrentGame);
    });

    game.value.on('ended', () => offlineGamesStorage.clearCurrentGame());

    initWinOverlay(game.value, gameView.value);
};

/*
 * Game end: win popin
 */
const gameFinishedOverlay = defineOverlay(OfflineGameFinishedOverlay);

let disposeWinOverlay: null | (() => void) = null;

const initWinOverlay = (game: Game, gameView: GameView) => {
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

        await gameFinishedOverlay({
            game,
            players: players.value,
        });
    };

    game.on('ended', endedCallback);
    game.on('canceled', endedCallback);

    disposeWinOverlay = () => {
        disposed = true;
        game.off('ended', endedCallback);
        game.off('canceled', endedCallback);
    };
};

onUnmounted(() => disposeWinOverlay?.());

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

        <div class="game-menu">
            <router-link class="btn btn-outline-primary" :to="{ name: 'offline-lobby' }">{{ $t('back_to_menu') }}</router-link>
            <button class="btn btn-outline-warning" @click="rematch">{{ $t('restart') }}</button>
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
</style>
