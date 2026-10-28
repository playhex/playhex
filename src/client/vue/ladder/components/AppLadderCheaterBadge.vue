<script setup lang="ts">
import { computed, PropType } from 'vue';
import { t } from 'i18next';

const props = defineProps({
    /**
     * Reasons of cheats reported on ladder games, most recent first
     */
    reasons: {
        type: Array as PropType<string[]>,
        required: true,
    },
});

const title = computed((): string => props.reasons.map(reason => t('ladder.cheater_reason', { reason })).join('\n'));
</script>

<template>
    <span v-if="reasons.length > 0" class="badge text-bg-danger" :title>{{ $t('ladder.cheater') }}</span>
</template>
