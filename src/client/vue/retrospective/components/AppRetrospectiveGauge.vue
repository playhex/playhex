<script setup lang="ts">
import { computed } from 'vue';

/**
 * Ring gauge, value between 0 and 1, with its percent in the middle.
 */
const props = defineProps<{
    value: number;
}>();

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const dash = computed(() => `${CIRCUMFERENCE * Math.min(1, Math.max(0, props.value))} ${CIRCUMFERENCE}`);
</script>

<template>
    <svg viewBox="0 0 100 100" class="retro-gauge" role="img" :aria-label="`${Math.round(value * 100)} %`">
        <circle cx="50" cy="50" :r="RADIUS" class="retro-gauge-track" />
        <circle cx="50" cy="50" :r="RADIUS" class="retro-gauge-value" :stroke-dasharray="dash" transform="rotate(-90 50 50)" />
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central">{{ Math.round(value * 100) }} %</text>
    </svg>
</template>

<style lang="stylus" scoped>
.retro-gauge
    width 7.5rem
    height 7.5rem

    circle
        fill none
        stroke-width 9

    text
        fill currentColor
        font-size 1.3rem
        font-weight 700

.retro-gauge-track
    stroke var(--bs-border-color)

.retro-gauge-value
    stroke var(--bs-success)
    stroke-linecap round
</style>
