<script setup lang="ts">
import { computed, PropType, ref, watch } from 'vue';

/**
 * Slider with two handles to select a range [from, to].
 * Model is updated only when releasing a handle, to not trigger too many updates while dragging.
 */
const model = defineModel<[number, number]>({ required: true });

const props = defineProps({
    min: {
        type: Number,
        required: true,
    },
    max: {
        type: Number,
        required: true,
    },
    step: {
        type: Number,
        default: 1,
    },
    label: {
        type: String,
        required: false,
        default: undefined,
    },

    /**
     * How to display a value, e.g. to display max value as "30+"
     */
    formatValue: {
        type: Function as PropType<(value: number) => string>,
        default: (value: number) => String(value),
    },
});

/**
 * Displayed values, updated while dragging.
 */
const local = ref<[number, number]>([...model.value]);

watch(model, value => local.value = [...value]);

const setFrom = (event: Event) => {
    const value = Math.min(+(event.target as HTMLInputElement).value, local.value[1]);
    (event.target as HTMLInputElement).value = String(value);
    local.value = [value, local.value[1]];
};

const setTo = (event: Event) => {
    const value = Math.max(+(event.target as HTMLInputElement).value, local.value[0]);
    (event.target as HTMLInputElement).value = String(value);
    local.value = [local.value[0], value];
};

const commit = () => {
    if (local.value[0] !== model.value[0] || local.value[1] !== model.value[1]) {
        model.value = [...local.value];
    }
};

const percent = (value: number) => (value - props.min) / (props.max - props.min) * 100;

const trackStyle = computed(() => ({
    left: percent(local.value[0]) + '%',
    right: (100 - percent(local.value[1])) + '%',
}));
</script>

<template>
    <div class="range-slider">
        <div class="d-flex justify-content-between small">
            <span v-if="label">{{ label }}</span>
            <span class="text-body-secondary">
                <template v-if="local[0] === local[1]">{{ formatValue(local[0]) }}</template>
                <template v-else>{{ formatValue(local[0]) }} - {{ formatValue(local[1]) }}</template>
            </span>
        </div>
        <div class="inputs">
            <div class="track"></div>
            <div class="track-selected" :style="trackStyle"></div>
            <input
                type="range"
                :min
                :max
                :step
                :value="local[0]"
                @input="setFrom"
                @change="commit"
                :aria-label="(label ?? '') + ' min'"
                :class="{ 'on-top': local[0] >= max - step }"
            >
            <input
                type="range"
                :min
                :max
                :step
                :value="local[1]"
                @input="setTo"
                @change="commit"
                :aria-label="(label ?? '') + ' max'"
            >
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.inputs
    position relative
    height 1.5rem

    .track, .track-selected
        position absolute
        top 50%
        height .3rem
        margin-top -.15rem
        border-radius .15rem

    .track
        left 0
        right 0
        background var(--bs-secondary-bg)

    .track-selected
        background var(--bs-primary)

    input
        position absolute
        left 0
        top 0
        width 100%
        height 100%
        margin 0
        background none
        pointer-events none
        appearance none

        &.on-top
            z-index 1

        &::-webkit-slider-runnable-track
            background none
            height 1.5rem

        &::-moz-range-track
            background none

        &::-webkit-slider-thumb
            pointer-events auto
            appearance none
            margin-top .25rem
            width 1rem
            height 1rem
            border-radius 50%
            background var(--bs-primary)
            border 2px solid var(--bs-body-bg)
            cursor pointer

        &::-moz-range-thumb
            pointer-events auto
            width 1rem
            height 1rem
            border-radius 50%
            background var(--bs-primary)
            border 2px solid var(--bs-body-bg)
            cursor pointer
</style>
