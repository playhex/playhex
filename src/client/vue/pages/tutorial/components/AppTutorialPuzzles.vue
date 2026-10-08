<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TutorialPuzzle } from '../../../../../shared/app/tutorial/tutorialPuzzles.js';
import AppTutorialPuzzle from './AppTutorialPuzzle.vue';
import { IconArrowLeft, IconArrowRight, IconCheckCircleFill } from '../../../icons.js';

/**
 * Puzzles one by one, with navigation between them.
 * Emits allSolved once every puzzle has been solved.
 */
const props = defineProps<{
    puzzles: TutorialPuzzle[];
}>();

const emit = defineEmits<{
    allSolved: [];
}>();

const currentIndex = ref(0);
const solvedIndexes = ref(new Set<number>());

const currentSolved = computed(() => solvedIndexes.value.has(currentIndex.value));
const isLast = computed(() => currentIndex.value === props.puzzles.length - 1);

const onSolved = (): void => {
    solvedIndexes.value.add(currentIndex.value);

    if (solvedIndexes.value.size === props.puzzles.length) {
        emit('allSolved');
    }
};
</script>

<template>
    <div class="mb-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
            <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :disabled="currentIndex === 0"
                @click="currentIndex--"
                :aria-label="$t('tutorial.previous_puzzle')"
            ><IconArrowLeft /></button>

            <span class="d-flex align-items-center gap-2">
                <strong>{{ $t('tutorial.puzzle_n_of_total', { n: currentIndex + 1, total: puzzles.length }) }}</strong>
                <span class="d-inline-flex gap-1">
                    <button
                        v-for="(_, index) in puzzles"
                        :key="index"
                        type="button"
                        class="btn btn-sm p-0 puzzle-dot"
                        :class="{ 'text-success': solvedIndexes.has(index), 'text-body-secondary': !solvedIndexes.has(index), current: index === currentIndex }"
                        :aria-label="$t('tutorial.puzzle_n_of_total', { n: index + 1, total: puzzles.length })"
                        @click="currentIndex = index"
                    >
                        <IconCheckCircleFill v-if="solvedIndexes.has(index)" />
                        <template v-else>●</template>
                    </button>
                </span>
            </span>

            <button
                type="button"
                class="btn btn-sm"
                :class="currentSolved && !isLast ? 'btn-success' : 'btn-outline-secondary'"
                :disabled="isLast"
                @click="currentIndex++"
                :aria-label="$t('tutorial.next_puzzle')"
            ><IconArrowRight /></button>
        </div>

        <!-- key: new board and puzzle state for each puzzle -->
        <AppTutorialPuzzle
            :key="currentIndex"
            :puzzle="puzzles[currentIndex]"
            @solved="onSolved"
        >
            <template #actions>
                <p v-if="currentSolved && !isLast" class="text-center mb-3">
                    <button
                        type="button"
                        class="btn btn-lg btn-success"
                        @click="currentIndex++"
                    >{{ $t('tutorial.next_puzzle') }} <IconArrowRight /></button>
                </p>
            </template>
        </AppTutorialPuzzle>
    </div>
</template>

<style lang="stylus" scoped>
.puzzle-dot
    line-height 1
    border none

    &.current
        transform scale(1.3)
</style>
