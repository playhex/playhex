<script lang="ts" setup>
import { ref, watch } from 'vue';
import { BIconHourglass } from 'bootstrap-icons-vue';
import { BYO_YOMI_PERIODS_MAX, BYO_YOMI_PERIODS_MIN, defaultTimeControlTypes, getInitialTimeStep, getSecondaryTimeStep, initialTimeSteps, isSameTimeControlType, msToDuration, secondaryTimeSteps } from '../../../shared/app/timeControlUtils.js';
import TimeControlType from '../../../shared/time-control/TimeControlType.js';
import { t } from 'i18next';

const timeControlType = defineModel<TimeControlType>({
    required: true,
});

const suggestedTimeControls: { label: string, timeControl: TimeControlType }[] = [
    {
        label: `${t('time_control.fast')} 5 + 2`,
        timeControl: defaultTimeControlTypes.fast,
    },
    {
        label: `${t('time_control.normal')} 10 + 5`,
        timeControl: defaultTimeControlTypes.normal,
    },
    {
        label: `${t('time_control.long')} 30 + 15`,
        timeControl: defaultTimeControlTypes.long,
    },
];

const capped = ref(false);

const setCappedFromTimeControl = (timeControlType: TimeControlType): void => {
    if ('fischer' === timeControlType.family) {
        const { maxTime, initialTime } = timeControlType.options;

        capped.value = maxTime === initialTime;
    }
};

setCappedFromTimeControl(timeControlType.value);

const initialTimeStep = ref(getInitialTimeStep(timeControlType.value));
const secondaryTimeStep = ref(getSecondaryTimeStep(timeControlType.value));

const selectTimeControl = (timeControl: TimeControlType): void => {
    timeControlType.value = {
        family: timeControl.family,
        options: {
            ...timeControl.options,
        },
    } as TimeControlType;

    setCappedFromTimeControl(timeControl);

    initialTimeStep.value = getInitialTimeStep(timeControl);
    secondaryTimeStep.value = getSecondaryTimeStep(timeControl);
};

const changeFamily = (family: 'fischer' | 'byoyomi'): void => {
    if ('fischer' === family && 'byoyomi' === timeControlType.value.family) {
        selectTimeControl({
            family,
            options: {
                initialTime: timeControlType.value.options.initialTime,
                timeIncrement: timeControlType.value.options.periodTime,
                maxTime: capped.value ? timeControlType.value.options.initialTime : undefined,
            },
        });
    } else if ('byoyomi' === family && 'fischer' === timeControlType.value.family) {
        selectTimeControl({
            family,
            options: {
                initialTime: timeControlType.value.options.initialTime,
                periodsCount: 5,

                // In case player select fischer, set 0 time increment, then select byo yomi,
                // prevent sending periodTime=0, then getting a 400 error.
                periodTime: Math.max(timeControlType.value.options.timeIncrement ?? 1000, 1000),
            },
        });
    }
};

// update initialTime when sliding
watch(initialTimeStep, step => {
    timeControlType.value.options.initialTime = initialTimeSteps[step];
    timeControlType.value = {
        ...timeControlType.value,
    };

    if ('fischer' === timeControlType.value.family && capped.value) {
        timeControlType.value.options.maxTime = timeControlType.value.options.initialTime;
    }
});

// update secondary time when sliding
watch(secondaryTimeStep, step => {
    if ('fischer' === timeControlType.value.family) {
        timeControlType.value.options.timeIncrement = secondaryTimeSteps[step];
    }

    if ('byoyomi' === timeControlType.value.family) {
        timeControlType.value.options.periodTime = secondaryTimeSteps[step];
    }

    timeControlType.value = {
        ...timeControlType.value,
    };
});

// set/unset maxTime when checking capped
watch(capped, isCapped => {
    if ('fischer' !== timeControlType.value.family) {
        return;
    }

    timeControlType.value.options.maxTime = isCapped
        ? timeControlType.value.options.initialTime
        : undefined
    ;
});
</script>

<template>
    <h6><BIconHourglass /> {{ $t('game.time_control') }}</h6>

    <button
        v-for="{ timeControl, label } in suggestedTimeControls" :key="label"
        @click="selectTimeControl(timeControl)"
        :class="isSameTimeControlType(timeControlType, timeControl) ? 'btn-primary' : 'btn-outline-primary'"
        class="btn btn-sm me-2"
        type="button"
    >{{ label }}</button>

    <div class="mt-2">

        <!-- Fischer -->
        <template v-if="'fischer' === timeControlType.family">

            <!-- use Byoyomi -->
            <div>
                <strong class="min-w">{{ $t('time_control.fischer') }}</strong>
                <button type="button" @click="changeFamily('byoyomi')" class="btn btn-sm btn-link">{{ $t('time_control.use', { type: $t('time_control.byo_yomi') }) }}</button>
            </div>

            <!-- Initial time label -->
            <label for="custom-fischer-initial-time" class="form-label">
                {{ $t('2dots', { s: $t('time_control.initial_time') }) }}
                {{ msToDuration(initialTimeSteps[initialTimeStep]) }}
            </label>

            <!-- Initial time slider -->
            <input
                v-model="initialTimeStep"
                type="range"
                min="0"
                :max="Object.keys(initialTimeSteps).length - 1" step="1"
                class="form-range"
                id="custom-fischer-initial-time"
            >

            <!-- Time increment label -->
            <label for="custom-fischer-time-increment" class="form-label">
                {{ $t('2dots', { s: $t('time_control.time_increment') }) }}
                {{ msToDuration(secondaryTimeSteps[secondaryTimeStep]) }}
            </label>

            <!-- Time increment slider -->
            <input
                v-model="secondaryTimeStep"
                type="range"
                class="form-range"
                id="custom-fischer-time-increment"
                min="0"
                :max="Object.keys(secondaryTimeSteps).length - 1"
                step="1"
            >

            <!-- Fischer capped checkbox -->
            <div class="form-check">
                <input class="form-check-input" v-model="capped" type="checkbox" id="capped">
                <label class="form-check-label" for="capped">
                    {{ $t('time_control.fischer_capped') }}
                </label>
            </div>

        </template>

        <!-- Byoyomi -->
        <template v-if="'byoyomi' === timeControlType.family">

            <!-- use Fischer -->
            <div>
                <strong class="min-w">{{ $t('time_control.byo_yomi') }}</strong>
                <button type="button" @click="changeFamily('fischer')" class="btn btn-sm btn-link">{{ $t('time_control.use', { type: $t('time_control.fischer') }) }}</button>
            </div>

            <!-- Initial time label -->
            <label for="custom-byoyomi-initial-time" class="form-label">
                {{ $t('2dots', { s: $t('time_control.initial_time') }) }}
                {{ msToDuration(initialTimeSteps[initialTimeStep]) }}
            </label>

            <!-- Initial time slider -->
            <input
                v-model="initialTimeStep"
                type="range"
                class="form-range"
                id="custom-byoyomi-initial-time"
                min="0"
                :max="Object.keys(initialTimeSteps).length - 1"
                step="1"
            >

            <!-- Periods count label -->
            <label for="custom-byoyomi-period-count" class="form-label">
                {{ $t('2dots', { s: $t('time_control.periods') }) }}
                {{ timeControlType.options.periodsCount }}
            </label>

            <!-- Periods count slider -->
            <input
                v-model="timeControlType.options.periodsCount"
                type="range"
                class="form-range"
                id="custom-byoyomi-period-count"
                :min="BYO_YOMI_PERIODS_MIN"
                :max="BYO_YOMI_PERIODS_MAX"
                step="1"
            >

            <!-- Periods time label -->
            <label for="custom-byoyomi-perdiod-time" class="form-label">
                {{ $t('2dots', { s: $t('time_control.periods_time') }) }}
                {{ msToDuration(secondaryTimeSteps[secondaryTimeStep]) }}
            </label>

            <!-- Periods time slider -->
            <input
                v-model="secondaryTimeStep"
                type="range"
                class="form-range"
                id="custom-byoyomi-perdiod-time"
                min="1"
                :max="Object.keys(secondaryTimeSteps).length - 1"
                step="1"
            >
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.min-w
    display inline-block
    min-width 6em

// Prevent scrolling when sliding a range input.
input[type=range]
    touch-action none
</style>
