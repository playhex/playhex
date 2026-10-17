<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { apiGetPuzzle, apiPostTrainingAttempt, apiPostTrainingSession } from '../../../apiClient.js';
import type { TrainingAttemptResult } from '../../../../shared/app/training/trainingDto.js';
import type { PuzzleReport } from '../../puzzles/composables/usePuzzle.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';
import AppPuzzle from '../../puzzles/components/AppPuzzle.vue';
import AppTrainingFeedback from '../components/AppTrainingFeedback.vue';
import { getPuzzleTitle } from '../../puzzles/services/puzzleTitle.js';
import { IconArrowRight } from '../../icons.js';
import type { TrainingType } from '../../../../shared/app/training/trainingLevels.js';

const props = defineProps<{
    trainingType: TrainingType;
}>();

useHead({
    title: t(`training.sections.${props.trainingType}.title`),
});

/**
 * Puzzles publicIds of this session, null while loading.
 */
const session = ref<null | string[]>(null);

const index = ref(0);

const puzzle = ref<null | Puzzle>(null);

const results = ref<{ puzzle: Puzzle, result: TrainingAttemptResult }[]>([]);

/**
 * Result of current puzzle, once solved or given up.
 */
const currentResult = ref<null | TrainingAttemptResult>(null);

const saveError = ref<null | string>(null);

const finished = ref(false);

const loadPuzzle = async (): Promise<void> => {
    puzzle.value = null;
    currentResult.value = null;
    saveError.value = null;

    const publicId = session.value![index.value];

    puzzle.value = await apiGetPuzzle(publicId);

    // Should not happen: puzzle removed during session
    if (puzzle.value === null) {
        next();
    }
};

const next = (): void => {
    if (index.value + 1 >= session.value!.length) {
        finished.value = true;
        return;
    }

    ++index.value;
    void loadPuzzle();
};

void (async () => {
    session.value = await apiPostTrainingSession(props.trainingType);

    if (session.value.length > 0) {
        await loadPuzzle();
    }
})();

const onResult = async (report: PuzzleReport, gaveUp: boolean): Promise<void> => {
    const currentPuzzle = puzzle.value!;

    try {
        const result = await apiPostTrainingAttempt(props.trainingType, {
            puzzlePublicId: currentPuzzle.publicId,
            lines: report.lines,
            hintUsed: report.hintUsed,
            gaveUp,
            inSession: true,
        });

        currentResult.value = result;
        results.value.push({ puzzle: currentPuzzle, result });
    } catch (e) {
        saveError.value = apiErrorMessage(e);
    }
};

const summary = computed(() => ({
    acquired: results.value.filter(({ result }) => result.state === 'acquired' && result.previousState !== 'acquired'),
    regressed: results.value.filter(({ result }) => result.state !== 'acquired' && result.previousState === 'acquired'),
    inProgress: results.value.filter(({ result }) => result.state !== 'acquired' && result.previousState !== 'acquired'),
}));
</script>

<template>
    <div v-if="null === session" class="container my-3">
        <p>{{ $t('training.loading') }}</p>
    </div>

    <div v-else-if="0 === session.length" class="container my-3">
        <p>{{ $t('training.nothing_to_train') }}</p>
        <router-link :to="{ name: `${trainingType}-training` }" class="btn btn-primary">{{ $t('training.back') }}</router-link>
    </div>

    <div v-else-if="finished" class="container my-3">
        <h1>{{ $t('training.summary_title') }}</h1>

        <template v-for="section in (['acquired', 'regressed', 'inProgress'] as const)" :key="section">
            <template v-if="summary[section].length > 0">
                <h2 class="h5 mt-3">{{ $t({ acquired: 'training.summary_acquired', regressed: 'training.summary_regressed', inProgress: 'training.summary_in_progress' }[section]) }}</h2>
                <ul>
                    <li v-for="{ puzzle: summaryPuzzle } in summary[section]" :key="summaryPuzzle.publicId">
                        <router-link :to="{ name: `${trainingType}-training-practice`, params: { publicId: summaryPuzzle.publicId } }">{{ getPuzzleTitle(summaryPuzzle) }}</router-link>
                    </li>
                </ul>
            </template>
        </template>

        <router-link :to="{ name: `${trainingType}-training` }" class="btn btn-primary mt-3">{{ $t('training.back') }}</router-link>
    </div>

    <AppPuzzle
        v-else-if="puzzle"
        :key="puzzle.publicId"
        :puzzle
        training
        @solved="report => onResult(report, false)"
        @gaveUp="report => onResult(report, true)"
    >
        <hr>

        <p class="text-body-secondary">{{ $t('training.counter', { current: index + 1, total: session.length }) }}</p>

        <AppTrainingFeedback v-if="currentResult" :result="currentResult" />

        <div v-if="saveError" class="alert alert-danger">{{ $t('training.save_error') }} {{ saveError }}</div>

        <button
            v-if="currentResult || saveError"
            class="btn btn-success"
            @click="next()"
        ><IconArrowRight /> {{ $t(index + 1 >= session.length ? 'training.see_summary' : 'training.next') }}</button>
    </AppPuzzle>

    <div v-else class="container my-3">
        <p>{{ $t('training.loading') }}</p>
    </div>
</template>
