<script lang="ts" setup>
import { PropType, computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { GameAnalyzeData } from '../../../shared/app/models/GameAnalyze.js';
import { GameAnalyzeFacade, preferMctsAnalyze } from '../../game-analyze/GameAnalyzeFacade.js';
import useCurrentGameStore from '../../stores/currentGameStore.js';
import { playhexTheme, resolveTheme } from '@playhex/pixi-board';
import { isSpecialHexMove } from '@playhex/move-notation';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';
import useAnalyzeStore from '../../stores/analyzeStore.js';
import useAuthStore from '../../stores/authStore.js';

const props = defineProps({
    analyze: {
        type: Object as PropType<GameAnalyzeData>,
        required: true,
    },
    gamePublicId: {
        type: String,
        required: true,
    },

    /**
     * Whether moves can be deeply analyzed, i.e game analyze has ended.
     */
    deepAnalyzeEnabled: {
        type: Boolean,
        default: false,
    },
});

const highlightedIndex = ref<null | number>(null);
const selectedIndex = ref<null | number>(null);
const moveAnalyze = computed(() => highlightedIndex.value === null
    ? null
    : preferMctsAnalyze(props.analyze[highlightedIndex.value]),
);

/**
 * Once a move is deeply analyzed, intuition analyzes are shown in background.
 */
const hasMcts = computed((): boolean => props.analyze.some(move => move?.mcts));

const analyzeStore = useAnalyzeStore();
const { loggedInPlayer } = storeToRefs(useAuthStore());

const isDeepAnalyzePending = computed((): boolean => moveAnalyze.value !== null
    && analyzeStore.isMctsMoveAnalyzePending(props.gamePublicId, moveAnalyze.value.moveIndex),
);

const canRequestDeepAnalyze = computed((): boolean => props.deepAnalyzeEnabled
    && loggedInPlayer.value !== null
    && moveAnalyze.value !== null
    && !moveAnalyze.value.mcts
    && !isSpecialHexMove(moveAnalyze.value.move.move),
);

const requestDeepAnalyze = (): void => {
    if (moveAnalyze.value === null) {
        return;
    }

    void analyzeStore.requestMctsMoveAnalyze(props.gamePublicId, moveAnalyze.value.moveIndex);
};

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
 * Color of the bar: player2 (white) when winning, else player1.
 * Unknown win rate is considered even.
 */
const barColorClass = (whiteWin: null | number): string => (whiteWin ?? 0.5) >= 0.5 ? 'player2' : 'player1';

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
    selectedIndex.value = moveIndex;
    gameAnalyzeFacade?.selectMove(moveIndex);
};

/**
 * Show selected move info again, so it can be deeply analyzed.
 */
const unhighlightMove = (): void => {
    highlightedIndex.value = selectedIndex.value;
};

// Show deep analyze marks on board once received for selected move.
// Not while exploring a variation, it would reset it: marks are shown when back to main position.
watch(
    () => selectedIndex.value !== null && !!props.analyze[selectedIndex.value]?.mcts,
    hasMctsResult => {
        if (hasMctsResult && simulatePlayingGameFacade.value?.getSimulationCursor() === 0) {
            gameAnalyzeFacade?.showCurrentAnalysisMarks();
        }
    },
);

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
    <div class="analyze-chart" :style="chartColors" @mouseleave="unhighlightMove()">
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
                :class="[barColorClass(displayedWhiteWin(move)), { background: hasMcts }]"
                :style="barStyle(displayedWhiteWin(move))"
            ></div>
            <div
                v-if="move?.mcts"
                class="bar"
                :class="barColorClass(move.mcts.move.whiteWin)"
                :style="barStyle(move.mcts.move.whiteWin)"
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

            <span v-if="moveAnalyze.mcts" class="badge text-bg-secondary ms-1">MCTS {{ moveAnalyze.mcts.playouts }}</span>
            <span v-else-if="isDeepAnalyzePending" class="text-body-secondary ms-1">
                <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                {{ $t('game_analysis.analyzing') }}
            </span>
            <button v-else-if="canRequestDeepAnalyze" type="button" class="btn btn-link btn-sm p-0 ms-1 align-baseline" @click="requestDeepAnalyze()">{{ $t('game_analysis.deep_analysis') }}</button>
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

        &.background
            opacity 0.3

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
