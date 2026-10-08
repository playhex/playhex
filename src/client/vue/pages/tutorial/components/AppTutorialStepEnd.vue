<script setup lang="ts">
import { computed } from 'vue';
import { getNextTutorialStep, type TutorialStepId } from '../tutorialSteps.js';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import { useTutorialGameCreation } from '../tutorialUtils.js';
import { IconArrowRight, IconCheckCircleFill, IconPeople } from '../../../icons.js';

/**
 * Bottom of a tutorial step: go to next step,
 * or leave tutorial and play against players.
 */
const props = defineProps<{
    stepId: TutorialStepId;

    /**
     * Step has nothing to complete (e.g only explanations):
     * it is completed when going to next step.
     */
    completeOnNext?: boolean;
}>();

const { isCompleted, markCompleted } = useTutorialControls();
const { playVsPlayer } = useTutorialGameCreation();

const nextStep = computed(() => getNextTutorialStep(props.stepId));
const completed = computed(() => props.completeOnNext || isCompleted(props.stepId));
</script>

<template>
    <div class="step-end card mt-4 mb-3" :class="completed && !completeOnNext ? 'border-success' : ''">
        <div class="card-body text-center">
            <template v-if="!completeOnNext">
                <p v-if="completed" class="text-success fw-bold"><IconCheckCircleFill /> {{ $t('tutorial.step_completed') }}</p>
                <p v-else class="text-body-secondary small">{{ $t('tutorial.step_not_completed_can_skip') }}</p>
            </template>

            <div class="d-flex flex-wrap justify-content-center align-items-center gap-3">
                <router-link
                    v-if="nextStep"
                    :to="{ name: nextStep.routeName }"
                    class="btn btn-lg"
                    :class="completed ? 'btn-success' : 'btn-outline-success'"
                    @click="completeOnNext && markCompleted(stepId, { silent: true })"
                >
                    <template v-if="completed">{{ $t('tutorial.next_step') }}</template>
                    <template v-else>{{ $t('tutorial.skip_step') }}</template>
                    <IconArrowRight />
                </router-link>

                <button
                    type="button"
                    class="btn btn-outline-primary"
                    @click="playVsPlayer"
                ><IconPeople /> {{ $t('tutorial.play_vs_players') }}</button>
            </div>
        </div>
    </div>
</template>
