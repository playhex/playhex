<script lang="ts" setup>
import { PropType, computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { GameAnalyzeData } from '../../../shared/app/models/GameAnalyze.js';
import { GameAnalyzeFacade, AnalyzeMoveOutput } from '../../game-analyze/GameAnalyzeFacade.js';
import useCurrentGameStore from '../../stores/currentGameStore.js';
import { playhexTheme, resolveTheme } from '@playhex/pixi-board';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';

const props = defineProps({
    analyze: {
        type: Object as PropType<GameAnalyzeData>,
        required: true,
    },
});

const highlightedIndex = ref<null | number>(null);
const moveAnalyze = computed((): null | AnalyzeMoveOutput => highlightedIndex.value === null
    ? null
    : props.analyze[highlightedIndex.value] ?? null,
);

const toCssColor = (color: number): string => '#' + color.toString(16).padStart(6, '0');

const playerLocalSettingsStore = usePlayerLocalSettingsStore();

const chartColors = computed(() => {
    const { colors } = resolveTheme(playhexTheme, playerLocalSettingsStore.displayedTheme());

    return {
        '--analyze-player1': toCssColor(colors.player1),
        '--analyze-player2': toCssColor(colors.player2),
    };
});

/**
 * Win rate after the move.
 * May be unknown while analyze is in progress, because it depends on next move analyze,
 * then fallback to engine value if played move is in best moves.
 */
const displayedWhiteWin = (moveAnalyze: GameAnalyzeData[number]): null | number => {
    if (moveAnalyze === null) {
        return null;
    }

    return moveAnalyze.move.whiteWin
        ?? moveAnalyze.bestMoves.find(bestMove => bestMove.move === moveAnalyze.move.move)?.whiteWin
        ?? null
    ;
};

/**
 * Bar from middle, up for player2, down for player1.
 * Only top and height are used, so it can be transitioned from any value to any other,
 * and from unknown (empty bar in the middle).
 */
const barStyle = (whiteWin: null | number) => {
    if (whiteWin === null) {
        return { top: '50%', height: '0%' };
    }

    return {
        top: `${(1 - Math.max(whiteWin, 0.5)) * 100}%`,
        height: `${Math.abs(whiteWin - 0.5) * 100}%`,
    };
};

const {
    gameView,
    simulatePlayingGameFacade,
} = storeToRefs(useCurrentGameStore());

const {
    enableSimulationMode,
} = useCurrentGameStore();

let gameAnalyzeFacade: null | GameAnalyzeFacade = null;
let cleanupFacadeListeners: (() => void) | null = null;

const highlightMove = (moveIndex: number): void => {
    highlightedIndex.value = moveIndex;
};

const selectMove = (moveIndex: number): void => {
    highlightedIndex.value = moveIndex;
    gameAnalyzeFacade?.selectMove(moveIndex);
};

onMounted(() => {
    if (gameView.value) {
        // update game view position when clicking on a move on analyze chart
        gameAnalyzeFacade = new GameAnalyzeFacade(
            gameView.value,
            () => props.analyze,
            showPositionAt => enableSimulationMode().goToMainPosition(showPositionAt),
        );
    }

    const onMainCursorChanged = (index: number) => {
        selectMove(index);
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
});

onUnmounted(() => {
    gameAnalyzeFacade?.hideCurrentAnalysisMarks();
    gameAnalyzeFacade = null;
    cleanupFacadeListeners?.();
    cleanupFacadeListeners = null;
});
</script>

<template>
    <div class="analyze-chart" :style="chartColors">
        <div
            v-for="(move, moveIndex) in props.analyze"
            :key="moveIndex"
            class="move"
            :class="{ highlighted: highlightedIndex === moveIndex }"
            @mouseenter="highlightMove(moveIndex)"
            @click="selectMove(moveIndex)"
        >
            <div v-if="null === displayedWhiteWin(move)" class="pending"></div>
            <div
                class="bar"
                :class="(displayedWhiteWin(move) ?? 0.5) >= 0.5 ? 'player2' : 'player1'"
                :style="barStyle(displayedWhiteWin(move))"
            ></div>
        </div>
    </div>

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
.analyze-chart
    display flex
    height 6em
    cursor pointer

    .move
        position relative
        flex 1 1 0
        min-width 0

        &.highlighted
            outline 1px solid var(--bs-body-color)
            outline-offset -1px
            z-index 1

    .bar
        position absolute
        left 0
        right 0
        transition top 40ms ease-out, height 40ms ease-out

        &.player1
            background-color var(--analyze-player1)

        &.player2
            background-color var(--analyze-player2)

    .pending
        position absolute
        left 0
        right 0
        top calc(50% - 2px)
        height 4px
        background-color var(--bs-secondary-bg)

.black
    color: var(--bs-red)

.white
    color: var(--bs-blue)
</style>
