<script setup lang="ts">
import { onUnmounted, useTemplateRef } from 'vue';
import { until, useElementVisibility, whenever } from '@vueuse/core';
import { AnimatorFacade, GameView, HexagonMark } from '@playhex/pixi-board';
import type { Move } from '@playhex/move-notation';
import { PlayerSettingsFacade } from '../../../../services/board-view-facades/PlayerSettingsFacade.js';
import { drawPuzzlePosition } from '../../../puzzles/services/puzzleBoard.js';

/**
 * Non-interactive board illustrating a template:
 * stones, and highlighted empty cells the template needs.
 */
const props = withDefaults(defineProps<{
    boardsize: number;
    redStones?: Move[];
    blueStones?: Move[];
    highlightedCells?: Move[];

    /**
     * Stones to animate once board is displayed, like a winning path.
     */
    animatedPath?: Move[];
}>(), {
    redStones: () => [],
    blueStones: () => [],
    highlightedCells: () => [],
    animatedPath: () => [],
});

/**
 * Bootstrap success color
 */
const HIGHLIGHT_COLOR = 0x198754;

// GameView must not be a vue ref, see GameView.ts
const gameView = new GameView(props.boardsize, { interactive: false });
const playerSettingsFacade = new PlayerSettingsFacade(gameView, { showCoords: false });

drawPuzzlePosition(gameView, {
    boardsize: props.boardsize,
    redStones: props.redStones,
    blueStones: props.blueStones,
    disabledCells: [],
});

for (const move of props.highlightedCells) {
    const mark = new HexagonMark(HIGHLIGHT_COLOR, 0.6);
    mark.setCoords(move);
    mark.alpha = 0.6;
    gameView.addEntity(mark, 'template');
}

const gameViewElement = useTemplateRef('game-view-element');
const isVisible = useElementVisibility(gameViewElement);

whenever(gameViewElement, async element => {
    await gameView.mount(element);

    if (props.animatedPath.length > 0) {
        // Animate when user sees it
        await until(isVisible).toBe(true);
        void new AnimatorFacade(gameView).animatePath(props.animatedPath);
    }
}, {
    once: true,
});

onUnmounted(() => {
    playerSettingsFacade.destroy();
    gameView.destroy();
});
</script>

<template>
    <div ref="game-view-element" class="tutorial-diagram w-100"></div>
</template>

<style lang="stylus" scoped>
.tutorial-diagram
    height 14em
</style>
