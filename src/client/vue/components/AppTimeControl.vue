<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { IconCalendar, IconLightningChargeFill } from '../icons.js';
import { DAY_MS, correspondenceInitialTimeSteps, correspondenceSecondaryTimeSteps, defaultTimeControlTypes, getInitialTimeStep, getSecondaryTimeStep, isSameTimeControlType, liveInitialTimeSteps, liveSecondaryTimeSteps, msToDuration } from '../../../shared/app/timeControlUtils.js';
import TimeControlType from '../../../shared/time-control/TimeControlType.js';
import { t } from 'i18next';
import useLobbyStore from '../../stores/lobbyStore.js';
import { storeToRefs } from 'pinia';

const timeControlType = defineModel<TimeControlType>({
    required: true,
});

const { currentLobby } = storeToRefs(useLobbyStore());

const currentInitialTimeSteps = computed(() =>
    currentLobby.value === 'live' ? liveInitialTimeSteps : correspondenceInitialTimeSteps,
);

const currentSecondaryTimeSteps = computed(() =>
    currentLobby.value === 'live' ? liveSecondaryTimeSteps : correspondenceSecondaryTimeSteps,
);

const liveSuggestedTimeControls: { label: string, timeControl: TimeControlType }[] = [
    { label: `${t('time_control.fast')} 5 + 2`, timeControl: defaultTimeControlTypes.fast },
    { label: `${t('time_control.normal')} 10 + 5`, timeControl: defaultTimeControlTypes.normal },
    { label: `${t('time_control.long')} 30 + 15`, timeControl: defaultTimeControlTypes.long },
];

const correspondenceSuggestedTimeControls: { label: string, timeControl: TimeControlType }[] = [
    { label: `${t('time_control.fast')} 1d + 1d`, timeControl: defaultTimeControlTypes.correspondenceFast },
    { label: `${t('time_control.normal')} 3d + 1d`, timeControl: defaultTimeControlTypes.correspondenceNormal },
    { label: `${t('time_control.long')} 7d + 1d`, timeControl: defaultTimeControlTypes.correspondenceLong },
];

const suggestedTimeControls = computed(() =>
    currentLobby.value === 'live' ? liveSuggestedTimeControls : correspondenceSuggestedTimeControls,
);

const capped = ref(false);

const setCappedFromTimeControl = (timeControlType: TimeControlType): void => {
    if (timeControlType.family === 'fischer') {
        const { maxTime, initialTime } = timeControlType.options;

        capped.value = maxTime === initialTime;
    }
};

setCappedFromTimeControl(timeControlType.value);

const initialTimeStep = ref(getInitialTimeStep(timeControlType.value, currentInitialTimeSteps.value));
const secondaryTimeStep = ref(getSecondaryTimeStep(timeControlType.value, currentSecondaryTimeSteps.value));

const selectTimeControl = (timeControl: TimeControlType): void => {
    timeControlType.value = {
        family: timeControl.family,
        options: {
            ...timeControl.options,
        },
    } as TimeControlType;

    setCappedFromTimeControl(timeControl);

    initialTimeStep.value = getInitialTimeStep(timeControl, currentInitialTimeSteps.value);
    secondaryTimeStep.value = getSecondaryTimeStep(timeControl, currentSecondaryTimeSteps.value);
};

const changeCadence = (newCadence: 'live' | 'correspondence'): void => {
    currentLobby.value = newCadence;
};

// when currentLobby changes and doesn't match the current time control, reset to default
watch(currentLobby, lobby => {
    const currentIsLive = timeControlType.value.options.initialTime < DAY_MS;

    if (lobby === 'live' && !currentIsLive) {
        selectTimeControl(defaultTimeControlTypes.normal);
    } else if (lobby === 'correspondence' && currentIsLive) {
        selectTimeControl(defaultTimeControlTypes.correspondenceNormal);
    }
}, { immediate: true });

// update initialTime when sliding
watch(initialTimeStep, step => {
    timeControlType.value.options.initialTime = currentInitialTimeSteps.value[step];
    timeControlType.value = {
        ...timeControlType.value,
    };

    if (timeControlType.value.family === 'fischer' && capped.value) {
        timeControlType.value.options.maxTime = timeControlType.value.options.initialTime;
    }
});

// update secondary time when sliding
watch(secondaryTimeStep, step => {
    if (timeControlType.value.family === 'fischer') {
        timeControlType.value.options.timeIncrement = currentSecondaryTimeSteps.value[step];
    }

    timeControlType.value = {
        ...timeControlType.value,
    };
});

// set/unset maxTime when checking capped
watch(capped, isCapped => {
    if (timeControlType.value.family !== 'fischer') {
        return;
    }

    timeControlType.value.options.maxTime = isCapped
        ? timeControlType.value.options.initialTime
        : undefined
    ;
});
</script>

<template>
    <!-- Live / Correspondence toggle -->
    <ul class="nav nav-underline mb-2">
        <li class="nav-item">
            <button type="button" @click="changeCadence('live')" :class="currentLobby === 'live' ? 'active text-success' : 'text-body'" class="nav-link">
                <IconLightningChargeFill />
                {{ $t('time_cadency.normal') }}
            </button>
        </li>
        <li class="nav-item">
            <button type="button" @click="changeCadence('correspondence')" :class="currentLobby === 'correspondence' ? 'active text-warning' : 'text-body'" class="nav-link">
                <IconCalendar />
                {{ $t('time_cadency.correspondence') }}
            </button>
        </li>
    </ul>

    <!-- Preset buttons -->
    <button
        v-for="{ timeControl, label } in suggestedTimeControls" :key="label"
        @click="selectTimeControl(timeControl)"
        :class="isSameTimeControlType(timeControlType, timeControl)
            ? (currentLobby === 'live' ? 'btn-success' : 'btn-warning')
            : (currentLobby === 'live' ? 'btn-outline-success' : 'btn-outline-warning')"
        class="btn btn-sm me-2"
        type="button"
    >{{ label }}</button>

    <div class="mt-2">
        <!-- Initial time label -->
        <label for="custom-initial-time" class="form-label">
            {{ $t('2dots', { s: $t('time_control.initial_time') }) }}
            {{ msToDuration(currentInitialTimeSteps[initialTimeStep]) }}
        </label>

        <!-- Initial time slider -->
        <input
            v-model="initialTimeStep"
            type="range"
            min="0"
            :max="currentInitialTimeSteps.length - 1"
            step="1"
            class="form-range"
            id="custom-initial-time"
        >

        <!-- Time increment label -->
        <label for="custom-time-increment" class="form-label">
            {{ $t('2dots', { s: $t('time_control.time_increment') }) }}
            {{ msToDuration(currentSecondaryTimeSteps[secondaryTimeStep]) }}
        </label>

        <!-- Time increment slider -->
        <input
            v-model="secondaryTimeStep"
            type="range"
            class="form-range"
            id="custom-time-increment"
            min="0"
            :max="currentSecondaryTimeSteps.length - 1"
            step="1"
        >

        <!-- Fischer capped checkbox -->
        <div class="form-check">
            <input class="form-check-input" v-model="capped" type="checkbox" id="capped">
            <label class="form-check-label" for="capped">
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
