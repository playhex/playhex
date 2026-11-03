<script setup lang="ts">
import { computed } from 'vue';
import type { HexMove } from '@playhex/move-notation';
import type { EngineGame } from '../../../../../shared/game-engine/index.js';
import { shouldSwap } from '../../../../../shared/swap-maps/swapDecision.js';
import { findLocalAIByName, instanciateAi } from '../../../offline-lobby/localAi.js';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import AppTutorialBotGame from '../components/AppTutorialBotGame.vue';
import AppTutorialStepEnd from '../components/AppTutorialStepEnd.vue';
import { IconLightbulb } from '../../../icons.js';
import type { TutorialStepId } from '../../../../../shared/app/tutorial/tutorialSteps.js';

/**
 * Beat Davies bot of given level on 11x11.
 */
const props = defineProps<{
    level: 1 | 4 | 7 | 10;
}>();

const SWAP_DELAY = 500;

const { markCompleted } = useTutorialControls();

const stepId = computed<TutorialStepId>(() => `davies-${props.level}`);

/**
 * Davies never swaps: swap decision comes from swap maps, like AIs playing online.
 */
const bot = computed(() => {
    const daviesBot = instanciateAi(findLocalAIByName(`davies-${props.level}`));

    return async (game: EngineGame): Promise<HexMove> => {
        if (game.canSwapNow() && shouldSwap(game.getSize(), game.getFirstMove()!.move)) {
            // Let player see their stone before it is swapped
            await new Promise(resolve => setTimeout(resolve, SWAP_DELAY));

            return 'swap-pieces';
        }

        return daviesBot(game);
    };
});

const onEnded = (won: boolean): void => {
    if (won) {
        void markCompleted(stepId.value);
    }
};
</script>

<template>
    <h1>{{ $t(`tutorial.steps.${stepId}`) }}</h1>

    <p>{{ $t(`tutorial.davies_${level}_intro`) }}</p>

    <p class="alert alert-info"><IconLightbulb /> {{ $t(`tutorial.davies_${level}_tip`) }}</p>

    <!-- key: new game when navigating between bot steps -->
    <AppTutorialBotGame
        :key="level"
        :boardsize="11"
        :bot
        canChangeColor
        @ended="onEnded"
    />

    <AppTutorialStepEnd :stepId />
</template>

