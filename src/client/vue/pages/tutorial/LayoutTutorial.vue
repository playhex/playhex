<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { tutorialSteps } from './tutorialSteps.js';
import { useTutorialControls } from '../../composables/tutorialControls.js';
import { IconCheckCircleFill } from '../../icons.js';

useHead({
    title: t('how_to_play_hex'),
});

const { isCompleted, completedCount, totalCount } = useTutorialControls();
</script>

<template>
    <div class="row g-0">
        <div class="col-12 col-sm-4 col-md-3 bg-dark-subtle">
            <div class="p-3 pb-0">
                <p class="h5 mb-2">{{ $t('tutorial.onboarding_title') }}</p>

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

                <p class="small text-body-secondary mt-1 mb-0">{{ $t('tutorial.n_steps_completed', { completed: completedCount, total: totalCount }) }}</p>
            </div>

            <nav class="nav tutorial-steps flex-nowrap flex-sm-column my-2 my-sm-3">
                <router-link
                    v-for="(step, index) in tutorialSteps"
                    :key="step.id"
                    :to="{ name: step.routeName }"
                    class="nav-link d-flex align-items-center gap-2"
                >
                    <IconCheckCircleFill v-if="isCompleted(step.id)" class="step-marker text-success" />
                    <span v-else class="step-marker step-number">{{ index + 1 }}</span>
                    <span>{{ $t(`tutorial.steps.${step.id}`) }}</span>
                </router-link>
            </nav>
        </div>
        <div class="col-12 col-sm-8 col-md-9 col-lg-7">
            <div class="container my-3">
                <router-view />
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.tutorial-steps
    // Horizontal scrollable steps on mobile
    overflow-x auto
    white-space nowrap

.step-marker
    flex-shrink 0
    width 1.5em
    height 1.5em

.step-number
    display inline-flex
    align-items center
    justify-content center
    border-radius 50%
    border 1px solid currentColor
    font-size 0.8em

.router-link-exact-active
    font-weight bold

    .step-number
        background-color var(--bs-link-color)
        border-color var(--bs-link-color)
        color var(--bs-body-bg)

    @media (min-width: 576px)
        border-right 3px solid

.container
    max-width 50em

    :deep() p
        font-size 1.2em

        &.lead
            font-size 1.5em

    :deep() h2
        margin-top 1em
        margin-bottom 0.5em
</style>
