<script lang="ts" setup>
import { PropType, Ref, ref, toRefs } from 'vue';
import { BIconHourglass } from 'bootstrap-icons-vue';
import { msToDuration } from '@shared/app/timeControlUtils';
import TimeControlType from '@shared/time-control/TimeControlType';
import HostedGameOptions from '../../../../../shared/app/models/HostedGameOptions';
import { t } from 'i18next';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);

const defaultTimeControls: { [key: string]: { label: string, timeControl: TimeControlType } } = {
    fast: {
        label: `${t('time_control.fast')} 5&nbsp;+&nbsp;2`,
        timeControl: {
            type: 'fischer',
            options: {
                initialTime: 300 * 1000,
                timeIncrement: 2 * 1000,
            },
        },
    },
    normal: {
        label: `${t('time_control.normal')} 10&nbsp;+&nbsp;5`,
        timeControl: {
            type: 'fischer',
            options: {
                initialTime: 600 * 1000,
                timeIncrement: 5 * 1000,
            },
        },
    },
    long: {
        label: `${t('time_control.long')} 30&nbsp;+&nbsp;15`,
        timeControl: {
            type: 'fischer',
            options: {
                initialTime: 1800 * 1000,
                timeIncrement: 15 * 1000,
            },
        },
    },
};

// Must be different that predefined ones,
// or "Custom" will be select first on Game option popin open
const customTimeControl: Ref<TimeControlType> = ref({
    type: 'fischer',
    options: {
        initialTime: 480 * 1000,
        timeIncrement: 5 * 1000,
    },
});

const showCustomTimeControl = ref(false);

/**
 * initial time for Fischer and ByoYomi
 */
const initialTimeSteps: number[] = [
    5 * 1000,
    10 * 1000,
    15 * 1000,
    30 * 1000,
    45 * 1000,
    60 * 1000,
    90 * 1000,
    60 * 2 * 1000,
    60 * 3 * 1000,
    60 * 4 * 1000,
    60 * 5 * 1000,
    60 * 7 * 1000,
    60 * 10 * 1000,
    60 * 12 * 1000,
    60 * 15 * 1000,
    60 * 20 * 1000,
    60 * 25 * 1000,
    60 * 30 * 1000,
    60 * 40 * 1000,
    60 * 45 * 1000,
    60 * 60 * 1000,
    60 * 75 * 1000,
    60 * 90 * 1000,
    60 * 120 * 1000,
    60 * 150 * 1000,
    60 * 180 * 1000,
    86400 * 1 * 1000,
    86400 * 3 * 1000,
    86400 * 7 * 1000,
    86400 * 14 * 1000,
];

/**
 * time increment for Fischer and period time for ByoYomi
 */
const secondaryTimeSteps: number[] = [
    0 * 1000,
    1 * 1000,
    2 * 1000,
    3 * 1000,
    4 * 1000,
    5 * 1000,
    6 * 1000,
    7 * 1000,
    8 * 1000,
    9 * 1000,
    10 * 1000,
    12 * 1000,
    15 * 1000,
    20 * 1000,
    25 * 1000,
    30 * 1000,
    40 * 1000,
    45 * 1000,
    60 * 1000,
    75 * 1000,
    90 * 1000,
    120 * 1000,
    150 * 1000,
    180 * 1000,
    3600 * 4 * 1000,
    3600 * 8 * 1000,
    3600 * 12 * 1000,
    86400 * 1 * 1000,
    86400 * 2 * 1000,
    86400 * 3 * 1000,
    86400 * 5 * 1000,
    86400 * 7 * 1000,
    86400 * 10 * 1000,
    86400 * 14 * 1000,
];

const initialTimeSelected = ref(Object.values(initialTimeSteps).findIndex(t => t === 600 * 1000));
const secondaryTimeIncrementSelected = ref(Object.values(secondaryTimeSteps).findIndex(t => t === 5 * 1000));
const byoyomiPeriodsCount = ref(5);

gameOptions.value.timeControl = defaultTimeControls.normal.timeControl;

/**
 * Set timeControl options values from form input values.
 * To be called before submit.
 */
const compileOptions = () => {
    if (showCustomTimeControl.value) {
        if ('fischer' === gameOptions.value.timeControl.type) {
            gameOptions.value.timeControl.options = {
                initialTime: initialTimeSteps[initialTimeSelected.value],
                timeIncrement: secondaryTimeSteps[secondaryTimeIncrementSelected.value],
            };
        }

        if ('byoyomi' === gameOptions.value.timeControl.type) {
            gameOptions.value.timeControl.options = {
                initialTime: initialTimeSteps[initialTimeSelected.value],
                periodTime: secondaryTimeSteps[secondaryTimeIncrementSelected.value],
                periodsCount: Number(byoyomiPeriodsCount.value),
            };

            // In case player select fischer, set 0 time increment, then select byo yomi,
            // prevent sending periodTime=0, then getting a 400 error.
            if (gameOptions.value.timeControl.options.periodTime < 1000) {
                gameOptions.value.timeControl.options.periodTime = 1000;
            }
        }
    }

    if ('fischer' === gameOptions.value.timeControl.type) {
        gameOptions.value.timeControl.options.maxTime = gameOptions.value.timeControl.options.initialTime;
    }
};

defineExpose({ compileOptions });
</script>

<template>
    <h6><BIconHourglass /> {{ $t('game.time_control') }}</h6>

    <div class="btn-group" role="group">
        <template v-for="{timeControl, label} in defaultTimeControls" :key="label">
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
        <label class="btn btn-outline-primary" for="time-control-custom">{{ $t('time_control.custom') }}</label>
    </div>

    <div v-if="showCustomTimeControl" class="mt-2">
        <div v-if="'fischer' === gameOptions.timeControl.type">
            <strong class="min-w">{{ $t('time_control.fischer') }}</strong>
            <button type="button" @click="() => gameOptions.timeControl.type = 'byoyomi'" class="btn btn-sm btn-link">{{ $t('time_control.use', { type: $t('time_control.byo_yomi') }) }}</button>
        </div>
        <div v-else>
            <strong class="min-w">{{ $t('time_control.byo_yomi') }}</strong>
            <button type="button" @click="() => gameOptions.timeControl.type = 'fischer'" class="btn btn-sm btn-link">{{ $t('time_control.use', { type: $t('time_control.fischer') }) }}</button>
        </div>

        <div v-if="'fischer' === gameOptions.timeControl.type">
            <label for="custom-fischer-initial-time" class="form-label">{{ $t('2dots', { s: $t('time_control.initial_time') }) }} {{ msToDuration(initialTimeSteps[initialTimeSelected]) }}</label>
            <input type="range" class="form-range" id="custom-fischer-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

            <label for="custom-fischer-time-increment" class="form-label">{{ $t('2dots', { s: $t('time_control.time_increment') }) }} {{ msToDuration(secondaryTimeSteps[secondaryTimeIncrementSelected]) }}</label>
            <input type="range" class="form-range" id="custom-fischer-time-increment" v-model="secondaryTimeIncrementSelected" min="0" :max="Object.keys(secondaryTimeSteps).length - 1" step="1">
        </div>
        <div v-if="'byoyomi' === gameOptions.timeControl.type">
            <label for="custom-byoyomi-initial-time" class="form-label">{{ $t('2dots', { s: $t('time_control.initial_time') }) }} {{ msToDuration(initialTimeSteps[initialTimeSelected]) }}</label>
            <input type="range" class="form-range" id="custom-byoyomi-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

            <label for="custom-byoyomi-period-count" class="form-label">{{ $t('2dots', { s: $t('time_control.periods') }) }} {{ byoyomiPeriodsCount }}</label>
            <input type="range" class="form-range" id="custom-byoyomi-period-count" v-model="byoyomiPeriodsCount" min="1" max="15" step="1">

            <label for="custom-byoyomi-perdiod-time" class="form-label">{{ $t('2dots', { s: $t('time_control.periods_time') }) }} {{ msToDuration(secondaryTimeSteps[secondaryTimeIncrementSelected]) }}</label>
            <input type="range" class="form-range" id="custom-byoyomi-perdiod-time" v-model="secondaryTimeIncrementSelected" min="1" :max="Object.keys(secondaryTimeSteps).length - 1" step="1">
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.min-w
    display inline-block
    min-width 6em
</style>
