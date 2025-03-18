<script lang="ts" setup>
/* eslint-env browser */
import { GameAnalyzeData } from '../../../shared/app/models/GameAnalyze.js';
import GameAnalyzeView, { AnalyzeMoveOutput } from '../../game-analyze/GameAnalyzeView.js';
import { PropType, onMounted, ref } from 'vue';
import GameView from '../../../shared/pixi-board/GameView.js';

const props = defineProps({
    analyze: {
        type: Object as PropType<GameAnalyzeData>,
        required: true,
    },
    gameView: {
        type: Object as PropType<null | GameView>,
        required: false,
        default: null,
    },
});

const { analyze, gameView } = props;
const gameAnalyzeContainer = ref<HTMLElement>();
const moveAnalyze = ref<null | AnalyzeMoveOutput>(null);

onMounted(async () => {
    if (!gameAnalyzeContainer.value) {
        throw new Error('element with ref="gameAnalyzeContainer" not found');
    }

    const gameAnalyzeView = new GameAnalyzeView(analyze);

    if (null !== gameView) {
        gameAnalyzeView.linkGameViewCursor(gameView);
    }

    gameAnalyzeView.mount(gameAnalyzeContainer.value);

    gameAnalyzeView.on('highlightedMoveChanged', move => moveAnalyze.value = move);
});
</script>

<template>
    <div class="review-pixi" ref="gameAnalyzeContainer"></div>

    <div class="analyze-move-info">
        <small v-if="moveAnalyze">
            {{ $t('move_number', { n: moveAnalyze.moveIndex + 1 }) }}
            -

            <template v-if="moveAnalyze.move.move === moveAnalyze.bestMoves[0].move">
                <span :class="moveAnalyze.color">{{ moveAnalyze.move.move }}</span> ({{ $t('game_analysis.best_move') }})
            </template>

            <template v-else>
                <span :class="moveAnalyze.color">{{ moveAnalyze.move.move }}</span>
                ({{ moveAnalyze.move.whiteWin?.toFixed(2) ?? '-' }})

                - {{ $t('game_analysis.best') }} <span :class="moveAnalyze.color">{{ moveAnalyze.bestMoves[0].move }}</span>
                ({{ moveAnalyze.bestMoves[0].whiteWin?.toFixed(2) ?? '-' }})
            </template>
        </small>
    </div>
</template>

<style lang="stylus" scoped>
.review-pixi
    height 6em

.black
    color: var(--bs-red)

.white
    color: var(--bs-blue)
</style>
