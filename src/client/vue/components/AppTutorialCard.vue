<script setup lang="ts">
import { useTutorialControls } from '../composables/tutorialControls.js';
import { IconRocketTakeOff } from '../icons.js';

/**
 * Promotes tutorial to new players, with their progress.
 */
const { shouldDisplayLink, dismissTutorial, completedCount, totalCount, firstIncompleteStep } = useTutorialControls();
</script>

<template>
    <div v-if="shouldDisplayLink" class="card mb-4 border-info">
        <div class="card-body">
            <button
                class="btn btn-sm btn-outline-secondary float-end ms-2"
                @click="dismissTutorial"
                type="button"
            >✕ {{ $t('dismiss') }}</button>

            <h5 class="card-title">
                {{ $t('tutorial.are_you_new_to_hex') }}
            </h5>

            <p class="card-text">{{ $t('tutorial.onboarding_card_desc') }}</p>

            <div class="d-flex flex-wrap align-items-center gap-3">
                <router-link
                    :to="{ name: completedCount > 0 ? firstIncompleteStep.routeName : 'tutorial' }"
                    class="btn btn-info"
                >
                    <IconRocketTakeOff />
                    {{ completedCount > 0 ? $t('tutorial.continue') : $t('tutorial.start') }}
                </router-link>

                <div v-if="completedCount > 0" class="flex-grow-1 tutorial-card-progress">
                    <div
                        class="progress"
                        role="progressbar"
                        :aria-label="$t('tutorial.progress')"
                        :aria-valuenow="completedCount"
                        aria-valuemin="0"
                        :aria-valuemax="totalCount"
                    >
                        <div class="progress-bar bg-success" :style="{ width: `${100 * completedCount / totalCount}%` }"></div>
                    </div>
                    <small class="text-body-secondary">{{ $t('tutorial.n_steps_completed', { completed: completedCount, total: totalCount }) }}</small>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.tutorial-card-progress
    min-width 10em
    max-width 20em
</style>
