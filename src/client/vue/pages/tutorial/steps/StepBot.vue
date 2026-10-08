<script setup lang="ts">
import { computed } from 'vue';
import { findLocalAIByName, instanciateAi } from '../../../offline-lobby/localAi.js';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import AppTutorialBotGame from '../components/AppTutorialBotGame.vue';
import AppTutorialStepEnd from '../components/AppTutorialStepEnd.vue';
import { IconLightbulb } from '../../../icons.js';
import type { TutorialStepId } from '../tutorialSteps.js';

/**
 * Beat Davies bot of given level on 11x11.
 */
const props = defineProps<{
    level: 1 | 4 | 7 | 10;
}>();

const { markCompleted } = useTutorialControls();

const stepId = computed<TutorialStepId>(() => `davies-${props.level}`);

const bot = computed(() => instanciateAi(findLocalAIByName(`davies-${props.level}`)));

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

