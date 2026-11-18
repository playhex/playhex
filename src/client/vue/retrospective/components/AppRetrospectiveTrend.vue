<script setup lang="ts">
import type { RetrospectiveTrend } from '../../../../shared/app/retrospective/retrospectiveTypes.js';
import { IconArrowDown, IconArrowUp, IconDash } from '../../icons.js';

/**
 * "Top X%" badge, and trend compared to previous year.
 */
withDefaults(defineProps<{
    topPercent?: number;
    topPercentTitle?: string;
    trend?: null | RetrospectiveTrend;

    /**
     * Previous value, displayed next to trend
     */
    previous?: null | string;
    previousYear?: number;
}>(), {
    topPercent: undefined,
    topPercentTitle: undefined,
    trend: null,
    previous: null,
    previousYear: undefined,
});
</script>

<template>
    <span v-if="topPercent || (trend && previousYear)" class="retro-trend">
        <span v-if="topPercent" class="badge text-bg-warning" :title="topPercentTitle">{{ $t('retrospective.top_percent', { percent: topPercent }) }}</span>
        <span
            v-if="trend && previousYear"
            class="small"
            :class="{ 'text-success': trend === 'up', 'text-danger': trend === 'down', 'text-body-secondary': trend === 'same' }"
            :title="$t(`retrospective.trend_${trend}`, { year: previousYear })"
        >
            <IconArrowUp v-if="trend === 'up'" />
            <IconArrowDown v-else-if="trend === 'down'" />
            <IconDash v-else />
            <template v-if="previous"> {{ previous }} {{ $t('retrospective.vs_year', { year: previousYear }) }}</template>
        </span>
    </span>
</template>

<style lang="stylus" scoped>
.retro-trend
    display inline-flex
    flex-wrap wrap
    align-items center
    gap 0.4rem
</style>
