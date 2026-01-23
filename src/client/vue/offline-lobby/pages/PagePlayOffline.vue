<script setup lang="ts">
/* eslint-env browser */
import { t } from 'i18next';
import { onUnmounted, Ref, ref } from 'vue';
import AppBoard from '../../components/AppBoard.vue';
import { Game, IllegalMove, PlayerIndex } from '../../../../shared/game-engine/index.js';
import { Player } from '../../../../shared/app/models/index.js';
import { OfflineAIGameOptions } from '../models/OfflineAIGameOptions.js';
import { findLocalAIByName, instanciateAi } from '../localAi.js';
import { defineOverlay } from '@overlastic/vue';
import OfflineGameFinishedOverlay from '../overlay/OfflineGameFinishedOverlay.vue';
import GameView from '../../../../shared/pixi-board/GameView.js';
import { OfflineGame } from '../models/OfflineGame.js';
import { offlineGamesStorage } from '../services/OfflineGamesStorage.js';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { useGameViewFacade } from '../../composables/useGameViewFacade.js';
import { GameViewFacade } from '../../../services/board-view-facades/GameViewFacade.js';

let gameView: null | GameView = null;
let gameViewFacade: null | GameViewFacade = null;
let lastGameOptions: OfflineAIGameOptions;
let calculateMove: (game: Game) => Promise<Move>;

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

    const game = new Game(gameOptions.boardsize);

    game.setAllowSwap(gameOptions.swapRule);

    gameViewFacade = useGameViewFacade(game).gameViewFacade;
    gameView = gameViewFacade.getGameView();

    gameView.on('hexClicked', move => {
        move = game.moveOrSwapPieces(move);

        try {
            game.move(move, playerIndex as PlayerIndex);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    const saveGame = () => {
        const currentGame = new OfflineGame();

        currentGame.gameOptions = gameOptions;
        currentGame.players = players.value.map(p => {
            p.currentRating = undefined;
            return p;
        });
        currentGame.gameData = game.toData();

        offlineGamesStorage.setCurrentGame(currentGame);
    };

    void makeAIMoveIfApplicable(game, players.value);
    game.on('played', () => makeAIMoveIfApplicable(game, players.value));
    game.on('played', () => saveGame());
    game.on('ended', () => offlineGamesStorage.clearCurrentGame());

    saveGame();

    initWinOverlay(gameViewFacade, game, players.value);
};

const reloadCurrentGame = (currentGame: OfflineGame) => {
    lastGameOptions = currentGame.gameOptions;
    players.value = currentGame.players;
    const localAI = findLocalAIByName(currentGame.gameOptions.ai);
    calculateMove = instanciateAi(localAI);

    const playerIndex = players.value.findIndex(p => !p.isBot);

    const game = Game.fromData(currentGame.gameData);

    gameViewFacade = useGameViewFacade(game).gameViewFacade;
    gameView = gameViewFacade.getGameView();

    gameView.on('hexClicked', move => {
        game.moveOrSwapPieces(move);

        try {
            game.move(move, playerIndex as PlayerIndex);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    void makeAIMoveIfApplicable(game, players.value);
    game.on('played', () => makeAIMoveIfApplicable(game, players.value));
    game.on('played', () => {
        const nextCurrentGame = new OfflineGame();

        nextCurrentGame.gameOptions = currentGame.gameOptions;
        nextCurrentGame.players = players.value.map(p => {
            p.currentRating = undefined;
            return p;
        });
        nextCurrentGame.gameData = game.toData();

        offlineGamesStorage.setCurrentGame(nextCurrentGame);
    });
    game.on('ended', () => offlineGamesStorage.clearCurrentGame());

    initWinOverlay(gameViewFacade, game, players.value);
};

/*
 * Game end: win popin
 */
const unlisteners: (() => void)[] = [];
const gameFinishedOverlay = defineOverlay(OfflineGameFinishedOverlay);

const initWinOverlay = (gameViewFacade: GameViewFacade, game: Game, players: Player[]) => {
    gameViewFacade.on('endedAndWinAnimationOver', () => {
        void gameFinishedOverlay({
            game,
            players,
        });
    });

    unlisteners.push(() => gameViewFacade.removeAllListeners('endedAndWinAnimationOver'));
};

onUnmounted(() => unlisteners.forEach(unlistener => unlistener()));

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
    <div class="offline-board-container">
        <AppBoard
            :key="reload"
            v-if="null !== gameViewFacade"
            :gameViewFacade
            :players
        />
    </div>

    <div class="game-menu">
        <router-link class="btn btn-outline-primary" :to="{ name: 'offline-lobby' }">{{ $t('back_to_menu') }}</router-link>
        <button class="btn btn-outline-warning" @click="rematch">{{ $t('restart') }}</button>
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
