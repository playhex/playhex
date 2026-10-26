<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { apiGetPuzzle, apiPostTrainingAttempt } from '../../../apiClient.js';
import type { TrainingAttemptResult } from '../../../../shared/app/training/trainingDto.js';
import type { PuzzleReport } from '../../puzzles/composables/usePuzzle.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';
import AppPuzzle from '../../puzzles/components/AppPuzzle.vue';
import AppTrainingFeedback from '../components/AppTrainingFeedback.vue';
import { getPuzzleTitle } from '../../puzzles/services/puzzleTitle.js';
import { IconArrowLeft } from '../../icons.js';
import type { TrainingType } from '../../../../shared/app/training/trainingLevels.js';

/*
 * Free practice of a single puzzle, outside of a training session.
 */

const props = defineProps<{
    trainingType: TrainingType;
}>();

const { publicId } = useRoute().params;

if (Array.isArray(publicId)) {
    throw new Error('Unexpected array in publicId parameter');
}

/**
 * null: loading, false: not found
 */
const puzzle = ref<null | false | Puzzle>(null);

useHead({
    title: () => puzzle.value
        ? `${getPuzzleTitle(puzzle.value)} - ${t(`training.sections.${props.trainingType}.title`)}`
        : t(`training.sections.${props.trainingType}.title`),
});

void (async () => {
    puzzle.value = await apiGetPuzzle(publicId) ?? false;
})();

const result = ref<null | TrainingAttemptResult>(null);
const saveError = ref<null | string>(null);

const onResult = async (report: PuzzleReport, gaveUp: boolean): Promise<void> => {
    try {
        result.value = await apiPostTrainingAttempt(props.trainingType, {
            puzzlePublicId: publicId,
            lines: report.lines,
            hintUsed: report.hintUsed,
            gaveUp,
            inSession: false,
        });
    } catch (e) {
        saveError.value = apiErrorMessage(e);
    }
};
</script>

<template>
    <AppPuzzle
        v-if="puzzle"
        :puzzle
        training
        @solved="report => onResult(report, false)"
        @gaveUp="report => onResult(report, true)"
    >
        <hr>

        <AppTrainingFeedback v-if="result" :result />

        <div v-if="saveError" class="alert alert-danger">{{ $t('training.save_error') }} {{ saveError }}</div>

        <router-link :to="{ name: `${trainingType}-training` }" class="btn btn-outline-primary"><IconArrowLeft /> {{ $t('training.back') }}</router-link>
    </AppPuzzle>

    <div v-else-if="null === puzzle" class="container-fluid my-3">
        <p>{{ $t('puzzles.loading') }}</p>
    </div>

    <div v-else class="container-fluid my-3">
        <p>{{ $t('puzzles.not_found') }}</p>
    </div>
</template>
