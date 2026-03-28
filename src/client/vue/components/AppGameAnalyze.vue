<script lang="ts" setup>
import { PropType, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { GameAnalyzeData } from '../../../shared/app/models/GameAnalyze.js';
import GameAnalyzeView, { AnalyzeMoveOutput } from '../../game-analyze/GameAnalyzeView.js';
import useCurrentGameStore from '../../stores/currentGameStore.js';
import { themes } from '../../../shared/pixi-board/BoardTheme.js';
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

onMounted(() => {
    if (!gameAnalyzeContainer.value) {
        throw new Error('element with ref="gameAnalyzeContainer" not found');
    }

    const gameAnalyzeView = new GameAnalyzeView(
        analyze,
        themes[usePlayerLocalSettingsStore().displayedTheme()],
    );

    if (gameView.value) {
        // update game view position when clicking on a move on analyze view
        gameAnalyzeView.linkGameViewCursor(
            gameView.value,
            showPositionAt => enableSimulationMode().goToMainPosition(showPositionAt),
        );
    }

    const onMainCursorChanged = (index: number) => {
        gameAnalyzeView.selectMove(index);
    };

    // update game analyze cursor when rewind/forward position with arrows or buttons
    watch(simulatePlayingGameFacade, (facade, oldFacade) => {
        oldFacade?.off('mainCursorChanged', onMainCursorChanged);
        facade?.on('mainCursorChanged', onMainCursorChanged);
    });

    void gameAnalyzeView.mount(gameAnalyzeContainer.value);

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
