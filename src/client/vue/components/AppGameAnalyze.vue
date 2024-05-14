<script lang="ts" setup>
/* eslint-env browser */
import { GameAnalyzeData } from '@shared/app/models/GameAnalyze';
import GameAnalyzeView, { AnalyzeMoveOutput } from '../../game-analyze/GameAnalyzeView';
import { PropType, onMounted, ref } from 'vue';

const props = defineProps({
    analyze: {
        type: Object as PropType<GameAnalyzeData>,
        required: true,
    },
});

const { analyze } = props;
const gameAnalyzeContainer = ref<HTMLElement>();
const moveAnalyze = ref<null | AnalyzeMoveOutput>(null);

onMounted(() => {
    if (!gameAnalyzeContainer.value) {
        throw new Error('element with ref="gameReview" not found');
    }

    const gameAnalyzeView = new GameAnalyzeView(gameAnalyzeContainer.value, analyze);

    gameAnalyzeContainer.value.appendChild(gameAnalyzeView.getView() as unknown as Node);

    gameAnalyzeView.on('selectedMove', move => moveAnalyze.value = move);
});
</script>

<template>
    <div class="review-pixi" ref="gameAnalyzeContainer"></div>
    <div class="analyze-move-info">
        <span v-if="moveAnalyze">
            <template v-if="moveAnalyze.move.move === moveAnalyze.bestMoves[0].move">
                <span :class="moveAnalyze.color">{{ moveAnalyze.move.move }}</span> ({{ $t('game_analyze.best_move') }})
            </template>

            <template v-else>
                <span :class="moveAnalyze.color">{{ moveAnalyze.move.move }}</span>
                ({{ moveAnalyze.move.whiteWin?.toFixed(2) ?? '-' }})

                - {{ $t('game_analyze.best') }} <span :class="moveAnalyze.color">{{ moveAnalyze.bestMoves[0].move }}</span>
                ({{ moveAnalyze.bestMoves[0].whiteWin?.toFixed(2) ?? '-' }})
            </template>
        </span>
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
