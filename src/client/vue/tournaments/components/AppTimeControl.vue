<script setup lang="ts">
import { PropType, ref, toRefs, watchEffect } from 'vue';
import TimeControlType from '../../../../shared/time-control/TimeControlType';
import { msToDuration } from '../../../../shared/app/timeControlUtils';
import { TimeControlForm, timeSteps } from './TimeControlForm';

const props = defineProps({
    timeControl: {
        type: Object as PropType<TimeControlType>,
        required: true,
    },
});

const { timeControl } = toRefs(props);

const timeControlForm = ref<TimeControlForm>(TimeControlForm.fromTimeControlType(timeControl.value));

watchEffect(() => {
    timeControlForm.value.toTimeControlType(timeControl.value);
});
</script>

<template>
    <div v-if="'live' === timeControlForm.cadency">
        <label for="initial-time" class="form-label">{{ $t('2dots', { s: $t('time_control.initial_time') }) }} {{ msToDuration(timeSteps.live.initial[timeControlForm.initialTimeStep]) }}</label>
        <input type="range" class="form-range" id="initial-time" v-model="timeControlForm.initialTimeStep" min="0" :max="Object.keys(timeSteps.live.initial).length - 1" step="1">

        <label for="time-increment" class="form-label">{{ $t('2dots', { s: $t('time_control.time_increment') }) }} {{ msToDuration(timeSteps.live.secondary[timeControlForm.secondaryTimeStep]) }}</label>
        <input type="range" class="form-range" id="time-increment" v-model="timeControlForm.secondaryTimeStep" min="0" :max="Object.keys(timeSteps.live.secondary).length - 1" step="1">

        <div class="form-check">
            <input class="form-check-input" v-model="timeControlForm.capped" type="checkbox" id="capped">
            <label class="form-check-label" for="capped">
                {{ $t('time_control.fischer_capped') }}
            </label>
        </div>
    </div>
</template>
