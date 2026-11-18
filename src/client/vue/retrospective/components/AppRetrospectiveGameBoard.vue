<script setup lang="ts">
import { computed } from 'vue';
import { gameMovesToBoardSvgPosition, renderBoardSvg } from '../../../../shared/app/boardSvg.js';
import type { HexMove, Move } from '@playhex/move-notation';

/**
 * Static board showing a game position:
 * final position with its winning path,
 * or, with blunder, position after the blunder with same marks as game analyze on blunder and best move.
 */
const props = withDefaults(defineProps<{
    boardsize: number;
    swapRule: boolean;
    moves: string[];
    id: string;
    blunder?: null | { move: string, bestMove: null | string };
}>(), {
    blunder: null,
});

const WIDTH = 600;
const HEIGHT = 380;

const isCell = (value: null | string): value is Move => value !== null && /^[a-z]+\d+$/.test(value);

const svg = computed(() => {
    const { stones, lastMove, winningPath } = gameMovesToBoardSvgPosition(props.boardsize, props.swapRule, props.moves as HexMove[]);
    const { blunder } = props;

    return renderBoardSvg({
        boardsize: props.boardsize,
        stones,
        ...(blunder === null
            ? { lastMove, highlighted: winningPath }
            : {
                analyzeMarks: {
                    playedMove: isCell(blunder.move) ? blunder.move : null,
                    playedMoveLoss: 1,
                    bestMove: isCell(blunder.bestMove) ? blunder.bestMove : null,
                },
            }
        ),
        x: 0,
        y: 0,
        width: WIDTH,
        height: HEIGHT,
        id: props.id,
    });
});
</script>

<template>
    <!-- eslint-disable-next-line vue/no-v-html svg only built from board coordinates, no user content -->
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="game-board" role="img" v-html="svg" />
</template>

<style lang="stylus" scoped>
.game-board
    width 100%
    max-width 36em
    height auto
    display block
    margin 0 auto
</style>
