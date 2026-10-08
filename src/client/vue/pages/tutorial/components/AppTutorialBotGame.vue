<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { AnimatorFacade, GameView } from '@playhex/pixi-board';
import type { HexMove } from '@playhex/move-notation';
import { EngineGame, IllegalMove, type PlayerIndex } from '../../../../../shared/game-engine/index.js';
import { GameViewFacade } from '../../../../services/board-view-facades/GameViewFacade.js';
import { listenLocalGameSounds } from '../../../offline-lobby/services/localGameSounds.js';
import { IconArrowClockwise, IconArrowCounterclockwise, IconCircleFill, IconFlag } from '../../../icons.js';

/**
 * Local game against a bot, played in browser.
 * Player can undo, resign, restart, and change color if allowed.
 */
const props = withDefaults(defineProps<{
    boardsize: number;
    bot: (game: EngineGame) => Promise<HexMove>;

    /**
     * Player color on first game.
     */
    playerIndex?: PlayerIndex;

    /**
     * Played by the bot instead of thinking, when it plays first.
     */
    openingMove?: HexMove;

    /**
     * Show a button to play next game with the other color.
     */
    canChangeColor?: boolean;

    allowSwap?: boolean;
}>(), {
    playerIndex: 0,
    openingMove: undefined,
    canChangeColor: false,
    allowSwap: true,
});

const emit = defineEmits<{
    started: [];
    played: [move: HexMove, moveIndex: number];
    undone: [movesCount: number];
    ended: [won: boolean];
}>();

const container = useTemplateRef<HTMLElement>('container');

const humanIndex = ref<PlayerIndex>(props.playerIndex);
const status = ref<'playing' | 'won' | 'lost'>('playing');
const botThinking = ref(false);

/**
 * Incremented when game state changes, to recompute what depends on game.
 */
const gameVersion = ref(0);

/**
 * Incremented on restart and undo, to ignore a bot move calculated for a previous position.
 */
let botMoveGeneration = 0;

/*
 * Not vue refs, see GameView.ts
 */
let game: null | EngineGame = null;
let gameView: null | GameView = null;
let gameViewFacade: null | GameViewFacade = null;
let disposeSounds: null | (() => void) = null;

const destroyGame = (): void => {
    disposeSounds?.();
    gameViewFacade?.getPlayerSettingsFacade().destroy();
    gameView?.destroy();

    game = null;
    gameView = null;
    gameViewFacade = null;
    disposeSounds = null;
};

const playBotMoveIfApplicable = async (currentGame: EngineGame): Promise<void> => {
    if (currentGame !== game || currentGame.isEnded() || currentGame.getCurrentPlayerIndex() === humanIndex.value) {
        return;
    }

    const generation = botMoveGeneration;

    botThinking.value = true;

    try {
        const move = await props.bot(currentGame);

        // Game restarted, or move undone while bot was thinking
        if (generation !== botMoveGeneration || currentGame.isEnded()) {
            return;
        }

        currentGame.move(move, currentGame.getCurrentPlayerIndex());
    } finally {
        if (generation === botMoveGeneration) {
            botThinking.value = false;
        }
    }
};

const startGame = async (): Promise<void> => {
    if (!container.value) {
        throw new Error('No container to mount tutorial game');
    }

    destroyGame();
    ++botMoveGeneration;

    const newGame = new EngineGame(props.boardsize);
    newGame.setAllowSwap(props.allowSwap);
    const botIndex: PlayerIndex = humanIndex.value === 0 ? 1 : 0;

    game = newGame;
    status.value = 'playing';
    botThinking.value = false;

    if (props.openingMove && botIndex === 0) {
        newGame.move(props.openingMove, 0);
    }

    gameView = new GameView(newGame.getSize());
    gameViewFacade = new GameViewFacade(gameView, newGame);

    gameView.on('hexClicked', coords => {
        if (botThinking.value || newGame.isEnded() || newGame.getCurrentPlayerIndex() !== humanIndex.value) {
            return;
        }

        try {
            newGame.move(newGame.moveOrSwapPieces(coords), humanIndex.value);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    newGame.on('played', (timestampedMove, moveIndex) => {
        emit('played', timestampedMove.move, moveIndex);
        void playBotMoveIfApplicable(newGame);
    });

    newGame.on('ended', winner => {
        const won = winner === humanIndex.value;

        status.value = won ? 'won' : 'lost';
        emit('ended', won);

        // No path when ended by resignation
        const winningPath = newGame.getBoard().getShortestWinningPath();

        if (winningPath && newGame === game && gameView) {
            void new AnimatorFacade(gameView).animatePath(winningPath);
        }
    });

    emit('started');

    for (const event of ['played', 'undo', 'ended'] as const) {
        newGame.on(event, () => ++gameVersion.value);
    }

    ++gameVersion.value;

    disposeSounds = listenLocalGameSounds(newGame, () => newGame.getWinner() === humanIndex.value
        ? '/sounds/lisp/Victory.ogg'
        : '/sounds/lisp/Defeat.ogg',
    );

    await gameView.mount(container.value);

    void playBotMoveIfApplicable(newGame);
};

const restart = (changeColor = false): void => {
    if (changeColor) {
        humanIndex.value = humanIndex.value === 0 ? 1 : 0;
    }

    void startGame();
};

/**
 * Undo player last move, and bot answer if already played.
 * Can be done while bot is thinking: its move is ignored.
 */
const canUndo = computed<boolean>(() => {
    void gameVersion.value;

    return game !== null && game.canPlayerUndo(humanIndex.value) === true;
});

const undo = (): void => {
    if (!game || !canUndo.value) {
        return;
    }

    ++botMoveGeneration;
    botThinking.value = false;

    game.playerUndo(humanIndex.value);
    emit('undone', game.getMovesHistory().length);
};

const resign = (): void => {
    if (!game || game.isEnded()) {
        return;
    }

    game.resign(humanIndex.value, new Date());
};

onMounted(() => void startGame());
onUnmounted(destroyGame);
</script>

<template>
    <div class="card mb-3">
        <div class="card-body">
            <div ref="container" class="board"></div>

            <p class="text-center card-text mt-2 mb-2">
                <slot name="message" :status :humanIndex :botThinking>
                    <template v-if="status === 'playing'">
                        {{ $t('tutorial.you_play') }}
                        <span v-if="humanIndex === 0" class="text-danger"><IconCircleFill /> {{ $t('game.red') }}</span>
                        <span v-else class="text-primary"><IconCircleFill /> {{ $t('game.blue') }}</span>
                    </template>
                    <template v-else-if="status === 'won'">{{ $t('tutorial.bot_game_won') }}</template>
                    <template v-else>{{ $t('tutorial.bot_game_lost') }}</template>
                </slot>
            </p>

            <div class="d-flex flex-wrap justify-content-center gap-2">
                <template v-if="status === 'playing'">
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-warning"
                        :disabled="!canUndo"
                        @click="undo"
                    ><IconArrowCounterclockwise /> {{ $t('undo.undo_move') }}</button>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        @click="resign"
                    ><IconFlag /> {{ $t('resign') }}</button>
                </template>

                <template v-else>
                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        @click="restart()"
                    ><IconArrowClockwise /> {{ $t('tutorial.play_again') }}</button>

                    <button
                        v-if="canChangeColor"
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        @click="restart(true)"
                    >
                        <template v-if="humanIndex === 0">{{ $t('tutorial.play_again_as_blue') }}</template>
                        <template v-else>{{ $t('tutorial.play_again_as_red') }}</template>
                    </button>
                </template>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.board
    width 100%
    height 60vh
</style>
