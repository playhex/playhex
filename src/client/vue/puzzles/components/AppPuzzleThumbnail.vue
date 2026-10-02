<script setup lang="ts">
import { onUnmounted, useTemplateRef } from 'vue';
import { whenever } from '@vueuse/core';
import { GameMarksFacade, GameView } from '@playhex/pixi-board';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { PlayerSettingsFacade } from '../../../services/board-view-facades/PlayerSettingsFacade.js';
import { drawPuzzlePosition } from '../services/puzzleBoard.js';

/*
 * Non-interactive board showing puzzle initial position.
 */

const props = defineProps<{
    puzzle: Puzzle;
}>();

// GameView must not be a vue ref, see GameView.ts
const gameView = new GameView(props.puzzle.boardsize, { interactive: false });
const playerSettingsFacade = new PlayerSettingsFacade(gameView, { showCoords: false });

drawPuzzlePosition(gameView, props.puzzle);

if (props.puzzle.lastMove !== null) {
    new GameMarksFacade(gameView).markLastMove(props.puzzle.lastMove);
}

const gameViewElement = useTemplateRef('game-view-element');

whenever(gameViewElement, async element => {
    await gameView.mount(element);
}, {
    once: true,
});

onUnmounted(() => {
    playerSettingsFacade.destroy();
    gameView.destroy();
});
</script>

<template>
    <div ref="game-view-element" class="puzzle-thumbnail w-100"></div>
</template>

<style lang="stylus" scoped>
.puzzle-thumbnail
    height 170px
</style>
