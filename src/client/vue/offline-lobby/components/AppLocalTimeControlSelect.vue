<script setup lang="ts">
import { computed } from 'vue';
import TimeControlType from '../../../../shared/time-control/TimeControlType.js';
import { getInitialTimeStep, getSecondaryTimeStep, isSameTimeControlType, liveInitialTimeSteps, liveSecondaryTimeSteps, msToDuration, timeControlToString } from '../../../../shared/app/timeControlUtils.js';
import { localTimeControls } from '../localTimeControls.js';
import { IconStopwatch } from '../../icons.js';

/**
 * Time control of a local game, null for no time control.
 * Presets, or custom Fischer time control with sliders, like online games.
 */
const timeControl = defineModel<null | TimeControlType>({
    required: true,
});

const isSame = (a: null | TimeControlType, b: null | TimeControlType): boolean => a === null || b === null
    ? a === b
    : isSameTimeControlType(a, b)
;

/**
 * Current time control, if custom (not in presets), to display it as a button.
 */
const customTimeControl = computed((): null | TimeControlType => localTimeControls.some(preset => isSame(preset, timeControl.value))
    ? null
    : timeControl.value,
);

const select = (preset: null | TimeControlType): void => {
    timeControl.value = preset === null
        ? null
        : { family: preset.family, options: { ...preset.options } } as TimeControlType
    ;
};

/**
 * Only Fischer can be customized with sliders.
 */
const fischerOptions = computed(() => timeControl.value?.family === 'fischer' ? timeControl.value.options : null);

const updateFischer = (options: { initialTime?: number, timeIncrement?: number, capped?: boolean }): void => {
    if (!fischerOptions.value) {
        return;
    }

    const initialTime = options.initialTime ?? fischerOptions.value.initialTime;
    const timeIncrement = options.timeIncrement ?? fischerOptions.value.timeIncrement;
    const capped = options.capped ?? fischerOptions.value.maxTime !== undefined;

    timeControl.value = {
        family: 'fischer',
        options: {
            initialTime,
            timeIncrement,
            maxTime: capped ? initialTime : undefined,
        },
    };
};

const initialTimeStep = computed({
    get: () => timeControl.value ? getInitialTimeStep(timeControl.value, liveInitialTimeSteps) : 0,
    set: (step: number) => updateFischer({ initialTime: liveInitialTimeSteps[step] }),
});

const secondaryTimeStep = computed({
    get: () => timeControl.value ? getSecondaryTimeStep(timeControl.value, liveSecondaryTimeSteps) : 0,
    set: (step: number) => updateFischer({ timeIncrement: liveSecondaryTimeSteps[step] }),
});

const capped = computed({
    get: () => fischerOptions.value?.maxTime !== undefined,
    set: (capped: boolean) => updateFischer({ capped }),
});
</script>

<template>
    <h6><IconStopwatch class="me-1" /> {{ $t('game.time_control') }}</h6>

    <button
        v-for="preset, index in localTimeControls" :key="index"
        type="button"
        class="btn btn-sm me-2 mb-2"
        :class="isSame(preset, timeControl) ? 'btn-success' : 'btn-outline-success'"
        @click="select(preset)"
    >{{ null === preset ? $t('local_play.no_time_control') : timeControlToString(preset) }}</button>

    <button
        v-if="customTimeControl"
        type="button"
        class="btn btn-sm btn-success me-2 mb-2"
    >{{ timeControlToString(customTimeControl) }}</button>

    <div v-if="fischerOptions" class="mt-2">
        <label for="local-initial-time" class="form-label">
            {{ $t('2dots', { s: $t('time_control.initial_time') }) }}
            {{ msToDuration(fischerOptions.initialTime) }}
        </label>
        <input
            v-model.number="initialTimeStep"
            type="range"
            min="0"
            :max="liveInitialTimeSteps.length - 1"
            step="1"
            class="form-range"
            id="local-initial-time"
        >

        <label for="local-time-increment" class="form-label">
            {{ $t('2dots', { s: $t('time_control.time_increment') }) }}
            {{ msToDuration(fischerOptions.timeIncrement ?? 0) }}
        </label>
        <input
            v-model.number="secondaryTimeStep"
            type="range"
            min="0"
            :max="liveSecondaryTimeSteps.length - 1"
            step="1"
            class="form-range"
            id="local-time-increment"
        >

        <div class="form-check">
            <input v-model="capped" class="form-check-input" type="checkbox" id="local-capped">
            <label class="form-check-label" for="local-capped">
                {{ $t('time_control.fischer_capped') }}
            </label>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
// Prevent scrolling when sliding a range input.
input[type=range]
    touch-action none
</style>
