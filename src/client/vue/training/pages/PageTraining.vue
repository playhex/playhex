<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { apiGetTraining } from '../../../apiClient.js';
import type { TrainingOverview } from '../../../../shared/app/training/trainingDto.js';
import { getTrainingState, isDue, type TrainingProgressData } from '../../../../shared/app/training/trainingRules.js';
import AppPuzzleThumbnail from '../../puzzles/components/AppPuzzleThumbnail.vue';
import AppTrainingStateBadge from '../components/AppTrainingStateBadge.vue';
import { getPuzzleTitle } from '../../puzzles/services/puzzleTitle.js';
import { IconLock } from '../../icons.js';
import type { TrainingType } from '../../../../shared/app/training/trainingLevels.js';

const props = defineProps<{
    trainingType: TrainingType;
}>();

useHead({
    title: t(`training.sections.${props.trainingType}.title`),
});

const overview = ref<null | TrainingOverview>(null);

void (async () => {
    overview.value = await apiGetTraining(props.trainingType);
})();

const now = new Date();

const dueCount = computed(() => overview.value === null
    ? 0
    : Object.values(overview.value.progresses).filter(progress => isDue(progress, now)).length,
);

const getProgress = (publicId: string): null | TrainingProgressData =>
    overview.value?.progresses[publicId] ?? null
;

const formatDate = (date: Date): string => intlFormat(
    date,
    { day: 'numeric', month: 'long' },
    { locale: autoLocale() },
);

const borderClasses = {
    new: '',
    not_acquired: 'border-danger',
    in_progress: 'border-warning',
    acquired: 'border-success',
};
</script>

<template>
    <div class="container my-3">
        <h1>{{ $t(`training.sections.${trainingType}.title`) }}</h1>

        <p class="lead">{{ $t(`training.sections.${trainingType}.intro`) }}</p>

        <p v-if="null === overview">{{ $t('training.loading') }}</p>

        <p v-else-if="0 === overview.levels.length">{{ $t('training.empty') }}</p>

        <template v-else>
            <p class="d-flex flex-wrap align-items-center gap-3">
                <router-link
                    :to="{ name: `${trainingType}-training-session` }"
                    class="btn btn-lg btn-success"
                >{{ $t('training.start_session') }}</router-link>

                <span v-if="dueCount > 0" class="text-body-secondary">{{ $t('training.due_count', { count: dueCount }) }}</span>
            </p>

            <section v-for="(level, index) in overview.levels" :key="index" class="mt-4">
                <h2 class="h4">
                    {{ $t('training.level', { number: index + 1 }) }}
                    <span
                        v-if="index >= overview.unlockedLevelsCount"
                        class="badge text-bg-secondary fs-6 align-middle"
                        :title="$t('training.locked_help')"
                    ><IconLock /> {{ $t('training.locked') }}</span>
                </h2>

                <div class="row g-3" :class="{ 'opacity-50': index >= overview.unlockedLevelsCount }">
                    <div v-for="puzzle in level" :key="puzzle.publicId" class="col-6 col-md-4 col-lg-3">
                        <div class="card h-100" :class="borderClasses[getTrainingState(getProgress(puzzle.publicId))]">
                            <router-link :to="{ name: `${trainingType}-training-practice`, params: { publicId: puzzle.publicId } }" class="card-body text-decoration-none p-2">
                                <AppPuzzleThumbnail :puzzle />
                            </router-link>

                            <div class="card-footer small">
                                <router-link
                                    :to="{ name: `${trainingType}-training-practice`, params: { publicId: puzzle.publicId } }"
                                    class="fw-bold d-block text-truncate"
                                >{{ getPuzzleTitle(puzzle) }}</router-link>

                                <div class="d-flex flex-wrap justify-content-between gap-1">
                                    <AppTrainingStateBadge :state="getTrainingState(getProgress(puzzle.publicId))" />

                                    <template v-if="getProgress(puzzle.publicId)">
                                        <span v-if="isDue(getProgress(puzzle.publicId)!, now)" class="text-warning-emphasis">{{ $t('training.review_due') }}</span>
                                        <span v-else class="text-body-secondary">{{ $t('training.next_review', { date: formatDate(getProgress(puzzle.publicId)!.nextReviewAt) }) }}</span>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </template>
    </div>
</template>
