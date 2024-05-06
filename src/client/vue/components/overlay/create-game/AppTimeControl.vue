<script lang="ts" setup>
import { PropType, Ref, ref, toRefs } from 'vue';
import { BIconHourglass } from 'bootstrap-icons-vue';
import { secondsToDuration } from '@shared/app/timeControlUtils';
import TimeControlType from '@shared/time-control/TimeControlType';
import HostedGameOptions from '../../../../../shared/app/models/HostedGameOptions';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);

const defaultTimeControls: { [key: string]: TimeControlType } = {
    'Fast 5&nbsp;+&nbsp;2': {
        type: 'fischer',
        options: {
            initialSeconds: 300,
            incrementSeconds: 2,
        },
    },
    'Normal 10&nbsp;+&nbsp;5': {
        type: 'fischer',
        options: {
            initialSeconds: 600,
            incrementSeconds: 5,
        },
    },
    'Long 30&nbsp;+&nbsp;15': {
        type: 'fischer',
        options: {
            initialSeconds: 1800,
            incrementSeconds: 15,
        },
    },
};

// Must be different that predefined ones,
// or "Custom" will be select first on Game option popin open
const customTimeControl: Ref<TimeControlType> = ref({
    type: 'fischer',
    options: {
        initialSeconds: 480,
        incrementSeconds: 5,
    },
});

const showCustomTimeControl = ref(false);

const initialTimeSteps: number[] = [
    5,
    10,
    15,
    30,
    45,
    60,
    90,
    60 * 2,
    60 * 3,
    60 * 4,
    60 * 5,
    60 * 7,
    60 * 10,
    60 * 12,
    60 * 15,
    60 * 20,
    60 * 25,
    60 * 30,
    60 * 40,
    60 * 45,
    60 * 60,
    60 * 75,
    60 * 90,
    60 * 120,
    60 * 150,
    60 * 180,
    86400 * 1,
    86400 * 3,
    86400 * 7,
    86400 * 14,
];

const secondaryTimeSteps: number[] = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    12,
    15,
    20,
    25,
    30,
    40,
    45,
    60,
    75,
    90,
    120,
    150,
    180,
    3600 * 4,
    3600 * 8,
    3600 * 12,
    86400 * 1,
    86400 * 2,
    86400 * 3,
    86400 * 5,
    86400 * 7,
    86400 * 10,
    86400 * 14,
];

const initialTimeSelected = ref(Object.values(initialTimeSteps).findIndex(t => t === 60 * 10));
const secondaryTimeIncrementSelected = ref(Object.values(secondaryTimeSteps).findIndex(t => t === 5));
const byoyomiPeriodsCount = ref(5);

gameOptions.value.timeControl = defaultTimeControls['Normal 10&nbsp;+&nbsp;5'];

/**
 * Set timeControl options values from form input values.
 * To be called before submit.
 */
const compileOptions = () => {
    if (showCustomTimeControl.value) {
        if ('fischer' === gameOptions.value.timeControl.type) {
            gameOptions.value.timeControl.options.initialSeconds = initialTimeSteps[initialTimeSelected.value];
            gameOptions.value.timeControl.options.incrementSeconds = secondaryTimeSteps[secondaryTimeIncrementSelected.value];
        }

        if ('byoyomi' === gameOptions.value.timeControl.type) {
            gameOptions.value.timeControl.options.initialSeconds = initialTimeSteps[initialTimeSelected.value];
            gameOptions.value.timeControl.options.periodSeconds = secondaryTimeSteps[secondaryTimeIncrementSelected.value];
            gameOptions.value.timeControl.options.periodsCount = Number(byoyomiPeriodsCount.value);
        }
    }

    if ('fischer' === gameOptions.value.timeControl.type) {
        gameOptions.value.timeControl.options.maxSeconds = gameOptions.value.timeControl.options.initialSeconds;
    }
};

defineExpose({ compileOptions });
</script>

<template>
    <h6><BIconHourglass /> Time control</h6>

    <div class="btn-group" role="group">
        <template v-for="(timeControl, label) in defaultTimeControls" :key="label">
            <input
                type="radio"
                name="time-control"
                class="btn-check"
                v-model="gameOptions.timeControl"
                :value="timeControl"
                @click="showCustomTimeControl = false"
                :id="'choice-' + label"
            >
            <!-- eslint-disable vue/no-v-html label is safe, see defaultTimeControls -->
            <label
                class="btn btn-outline-primary"
                :for="'choice-' + label"
                v-html="label"
            ></label>
        </template>

        <input type="radio" name="time-control" class="btn-check" v-model="gameOptions.timeControl" :value="customTimeControl" @click="showCustomTimeControl = true" id="time-control-custom">
        <label class="btn btn-outline-primary" for="time-control-custom">Custom</label>
    </div>

    <div v-if="showCustomTimeControl" class="mt-2">
        <div v-if="'fischer' === gameOptions.timeControl.type">
            <strong class="min-w">Fischer</strong>
            <button type="button" @click="() => gameOptions.timeControl.type = 'byoyomi'" class="btn btn-sm btn-link">Use Byo-yomi</button>
        </div>
        <div v-else>
            <strong class="min-w">Byo-yomi</strong>
            <button type="button" @click="() => gameOptions.timeControl.type = 'fischer'" class="btn btn-sm btn-link">Use Fischer</button>
        </div>

        <div v-if="'fischer' === gameOptions.timeControl.type">
            <label for="custom-fischer-initial-time" class="form-label">Initial time: {{ secondsToDuration(initialTimeSteps[initialTimeSelected]) }}</label>
            <input type="range" class="form-range" id="custom-fischer-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

            <label for="custom-fischer-time-increment" class="form-label">Time increment: {{ secondsToDuration(secondaryTimeSteps[secondaryTimeIncrementSelected]) }}</label>
            <input type="range" class="form-range" id="custom-fischer-time-increment" v-model="secondaryTimeIncrementSelected" min="0" :max="Object.keys(secondaryTimeSteps).length - 1" step="1">
        </div>
        <div v-if="'byoyomi' === gameOptions.timeControl.type">
            <label for="custom-byoyomi-initial-time" class="form-label">Initial time: {{ secondsToDuration(initialTimeSteps[initialTimeSelected]) }}</label>
            <input type="range" class="form-range" id="custom-byoyomi-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

            <label for="custom-byoyomi-period-count" class="form-label">Periods: {{ byoyomiPeriodsCount }}</label>
            <input type="range" class="form-range" id="custom-byoyomi-period-count" v-model="byoyomiPeriodsCount" min="0" max="15" step="1">

            <label for="custom-byoyomi-perdiod-time" class="form-label">Period time: {{ secondsToDuration(secondaryTimeSteps[secondaryTimeIncrementSelected]) }}</label>
            <input type="range" class="form-range" id="custom-byoyomi-perdiod-time" v-model="secondaryTimeIncrementSelected" min="0" :max="Object.keys(secondaryTimeSteps).length - 1" step="1">
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.min-w
    display inline-block
    min-width 6em
</style>
