<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { getTutorialChapterSteps, isBossTutorialStep, isSeoTutorialStep, tutorialChapters, tutorialSeoKey, tutorialSteps, type TutorialChapter } from '../../../../shared/app/tutorial/tutorialSteps.js';
import { useTutorialControls } from '../../composables/tutorialControls.js';
import { IconCaretDownFill, IconCaretRight, IconCheckCircleFill, IconSkull } from '../../icons.js';

const route = useRoute();

// Same title as server meta, crawlers executing javascript get this one
useHead({
    title: () => {
        const step = tutorialSteps.find(({ routeName }) => routeName === route.name);

        return step && isSeoTutorialStep(step)
            ? t(`social_preview.static.${tutorialSeoKey(step)}.title`)
            : t('how_to_play_hex')
        ;
    },
});

const { isCompleted, currentChapter, countChapterCompleted, firstIncompleteChapterStep } = useTutorialControls();

/**
 * Only steps of this chapter are displayed.
 */
const displayedChapter = computed<TutorialChapter>(() => {
    return tutorialSteps.find(step => step.routeName === route.name)?.chapter ?? currentChapter.value;
});

const displayedSteps = computed(() => getTutorialChapterSteps(displayedChapter.value));
const completedCount = computed<number>(() => countChapterCompleted(displayedChapter.value));
const totalCount = computed<number>(() => displayedSteps.value.length);

const isChapterCompleted = (chapter: TutorialChapter): boolean => {
    return countChapterCompleted(chapter) === getTutorialChapterSteps(chapter).length;
};
</script>

<template>
    <div class="row g-0">
        <div class="col-12 col-sm-4 col-md-3 bg-dark-subtle">
            <p class="h5 p-3 mb-0">{{ $t('tutorial.onboarding_title') }}</p>

            <div v-for="chapter in tutorialChapters" :key="chapter" class="chapter">
                <template v-if="chapter === displayedChapter">
                    <div class="px-3 pt-2">
                        <p class="chapter-title d-flex align-items-center gap-1 mb-2"><IconCaretDownFill class="chapter-marker" /> <span>{{ $t(`tutorial.chapters.${chapter}`) }}</span></p>

                        <div
                            class="progress chapter-progress"
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

                    <nav class="nav tutorial-steps flex-nowrap flex-sm-column mt-1 mb-2">
                        <router-link
                            v-for="(step, index) in displayedSteps"
                            :key="step.id"
                            :to="{ name: step.routeName }"
                            class="nav-link d-flex align-items-center gap-2"
                        >
                            <IconCheckCircleFill v-if="isCompleted(step.id)" class="step-marker text-success" />
                            <IconSkull v-else-if="isBossTutorialStep(step)" class="step-marker" />
                            <span v-else class="step-marker step-number">{{ index + 1 }}</span>
                            <span>{{ $t(`tutorial.steps.${step.id}`) }}</span>
                        </router-link>
                    </nav>
                </template>

                <router-link
                    v-else
                    :to="{ name: firstIncompleteChapterStep(chapter).routeName }"
                    class="chapter-title d-flex align-items-center gap-1 px-3 py-2 text-body-secondary text-decoration-none"
                >
                    <IconCheckCircleFill v-if="isChapterCompleted(chapter)" class="chapter-marker text-success" />
                    <IconCaretRight v-else class="chapter-marker" />
                    <span>{{ $t(`tutorial.chapters.${chapter}`) }}</span>
                </router-link>
            </div>
        </div>
        <div class="col-12 col-sm-8 col-md-9 col-lg-7">
            <div class="container my-3">
                <router-view />
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
// Same spacing whatever chapter is displayed, so chapters do not jump when switching
.chapter
    margin-bottom 1em

.chapter-title
    font-size 1.1em
    font-weight bold

.chapter-marker
    flex-shrink 0
    font-size 0.8em

.chapter-progress
    height 0.5em

.tutorial-steps
    // Horizontal scrollable steps on mobile
    overflow-x auto
    white-space nowrap
    font-size 0.9em

    .nav-link
        padding-top 0.3em
        padding-bottom 0.3em

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
