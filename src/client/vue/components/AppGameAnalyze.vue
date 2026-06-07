<script lang="ts" setup>
import { PropType, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { GameAnalyzeData } from '../../../shared/app/models/GameAnalyze.js';
import { GameAnalyzeChart } from '../../game-analyze/GameAnalyzeChart.js';
import { GameAnalyzeFacade, AnalyzeMoveOutput } from '../../game-analyze/GameAnalyzeFacade.js';
import useCurrentGameStore from '../../stores/currentGameStore.js';
import { themes } from '@playhex/pixi-board';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';

const props = defineProps({
    analyze: {
        type: Object as PropType<GameAnalyzeData>,
        required: true,
    },
});

const { analyze } = props;
const gameAnalyzeContainer = ref<HTMLElement>();
const moveAnalyze = ref<null | AnalyzeMoveOutput>(null);

const {
    gameView,
    simulatePlayingGameFacade,
} = storeToRefs(useCurrentGameStore());

const {
    enableSimulationMode,
} = useCurrentGameStore();

let gameAnalyzeFacade: null | GameAnalyzeFacade = null;
let lastSelectedMoveIndex: null | number = null;
let cleanupFacadeListeners: (() => void) | null = null;

onMounted(() => {
    if (!gameAnalyzeContainer.value) {
        throw new Error('element with ref="gameAnalyzeContainer" not found');
    }

    const gameAnalyzeChart = new GameAnalyzeChart(
        analyze,
        themes[usePlayerLocalSettingsStore().displayedTheme()],
    );

    if (gameView.value) {
        // update game view position when clicking on a move on analyze chart
        gameAnalyzeFacade = new GameAnalyzeFacade(
            gameView.value,
            analyze,
            showPositionAt => enableSimulationMode().goToMainPosition(showPositionAt),
        );

        if (lastSelectedMoveIndex !== null) {
            gameAnalyzeFacade.selectMove(lastSelectedMoveIndex);
        }
    }

    gameAnalyzeChart.on('highlightedMoveChanged', moveIndex => {
        moveAnalyze.value = analyze[moveIndex] ?? null;
    });

    gameAnalyzeChart.on('moveSelected', moveIndex => {
        lastSelectedMoveIndex = moveIndex;
        gameAnalyzeFacade?.selectMove(moveIndex);
    });

    const onMainCursorChanged = (index: number) => {
        lastSelectedMoveIndex = index;
        gameAnalyzeChart.setHighlightedMove(index);
        gameAnalyzeFacade?.selectMove(index);
        moveAnalyze.value = analyze[index] ?? null;
    };

    const onSimulationCursorChanged = (index: number) => {
        if (index > 0) {
            gameAnalyzeFacade?.showAnalysisMarks(null);
            return;
        }

        gameAnalyzeFacade?.showCurrentAnalysisMarks();
    };

    cleanupFacadeListeners = () => {
        simulatePlayingGameFacade.value?.off('mainCursorChanged', onMainCursorChanged);
        simulatePlayingGameFacade.value?.off('simulationCursorChanged', onSimulationCursorChanged);
    };

    // update game analyze cursor when rewind/forward position with arrows or buttons
    watch(simulatePlayingGameFacade, (facade, oldFacade) => {
        oldFacade?.off('mainCursorChanged', onMainCursorChanged);
        oldFacade?.off('simulationCursorChanged', onSimulationCursorChanged);
        facade?.on('mainCursorChanged', onMainCursorChanged);
        facade?.on('simulationCursorChanged', onSimulationCursorChanged);
    }, { immediate: true });

    void gameAnalyzeChart.mount(gameAnalyzeContainer.value);
});

onUnmounted(() => {
    gameAnalyzeFacade?.hideCurrentAnalysisMarks();
    gameAnalyzeFacade = null;
    cleanupFacadeListeners?.();
    cleanupFacadeListeners = null;
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
