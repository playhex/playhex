<script setup lang="ts">
import type { TrainingState } from '../../../../shared/app/training/trainingRules.js';

defineProps<{
    state: TrainingState;
}>();

const classes: { [state in TrainingState]: string } = {
    new: 'text-bg-secondary',
    not_acquired: 'text-bg-danger',
    in_progress: 'text-bg-warning',
    acquired: 'text-bg-success',
};
</script>

<template>
    <span class="badge" :class="classes[state]">{{ $t(`training.state.${state}`) }}</span>
</template>
