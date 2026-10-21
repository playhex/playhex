<script setup lang="ts">
import type { TrainingAttemptResult } from '../../../../shared/app/training/trainingDto.js';
import AppTrainingStateBadge from './AppTrainingStateBadge.vue';

/*
 * Result of an attempt: puzzle acquired, forgotten, or its current state.
 */

defineProps<{
    result: TrainingAttemptResult;
}>();
</script>

<template>
    <div v-if="result.state === 'acquired' && result.previousState !== 'acquired'" class="alert alert-success fw-bold">
        {{ $t('training.feedback.acquired') }}
    </div>
    <div v-else-if="result.previousState === 'acquired' && result.state !== 'acquired'" class="alert alert-warning">
        {{ $t('training.feedback.forgotten') }}
    </div>
    <p v-else>
        <i18next :translation="$t('training.feedback.state')">
            <template #state>
                <AppTrainingStateBadge :state="result.state" />
            </template>
        </i18next>
    </p>
</template>
