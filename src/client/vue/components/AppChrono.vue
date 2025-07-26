<script setup lang="ts">
/* eslint-env browser */
import TimeValue, { timeValueToMilliseconds } from '../../../shared/time-control/TimeValue.js';
import { PropType, onUnmounted, ref, toRefs, watch } from 'vue';
import { PlayerTimeData } from '../../../shared/time-control/TimeControl.js';
import { ByoYomiPlayerTimeData } from '../../../shared/time-control/time-controls/ByoYomiTimeControl.js';
import TimeControlType from '../../../shared/time-control/TimeControlType.js';
import { ByoYomiChrono } from '../../../shared/time-control/ByoYomiChrono.js';
import { msToDuration, msToTime } from '../../../shared/app/timeControlUtils.js';
import useServerDateStore from '../../stores/serverDateStore.js';

const props = defineProps({
    timeControlOptions: {
        type: Object as PropType<TimeControlType>,
        required: true,
    },
    playerTimeData: {
        type: Object as PropType<PlayerTimeData>,
        required: true,
    },
});

const { timeControlOptions, playerTimeData } = toRefs(props);

type ChronoData = {
    time: string;
    ms?: string;
    isPaused?: boolean;
    warning?: boolean;
};

const toChrono = (timeValue: TimeValue): ChronoData => {
    let ms = timeValueToMilliseconds(timeValue, useServerDateStore().newDate());
    const { floor } = Math;
    let sign = '';

    if (ms < 0) {
        ms = -ms;
        sign = '-';
    }

    const chrono: ChronoData = {
        time: `${sign}${msToTime(ms)}`,
        isPaused: typeof timeValue === 'number',
    };

    if (ms < 10000) {
        chrono.ms = `.${floor((ms % 1000) / 100)}`;
        chrono.warning = ms % 1000 < 500;
    }

    return chrono;
};

const chronoDisplay = ref<ChronoData>({ time: '…' });

let byoYomiChrono: null | ByoYomiChrono = null;

if (timeControlOptions.value.family === 'byoyomi') {
    const { initialTime, periodTime, periodsCount } = timeControlOptions.value.options;
    const { remainingMainTime, remainingPeriods } = (playerTimeData.value as ByoYomiPlayerTimeData);

    byoYomiChrono = new ByoYomiChrono(initialTime, periodTime, periodsCount);

    byoYomiChrono.setMainValue(remainingMainTime);
    byoYomiChrono.setRemainingPeriods(remainingPeriods);

    watch(playerTimeData, (newValue: ByoYomiPlayerTimeData) => {
        if (byoYomiChrono === null) {
            return;
        }

        byoYomiChrono.setMainValue(newValue.remainingMainTime);
        byoYomiChrono.setRemainingPeriods(newValue.remainingPeriods);
    });
}

const chronoThread = setInterval(() => {
    chronoDisplay.value = toChrono(byoYomiChrono !== null
        ? byoYomiChrono.getMainValue()
        : playerTimeData.value.totalRemainingTime,
    );
}, 50);

onUnmounted(() => clearInterval(chronoThread));
</script>

<template>
    <p :class="{ 'text-secondary': chronoDisplay.isPaused, 'text-warning': chronoDisplay.warning }">
        <span class="chrono-time">{{ chronoDisplay.time }}</span>
        <span v-if="chronoDisplay.ms">{{ chronoDisplay.ms }}</span>
        <span v-if="timeControlOptions.family === 'byoyomi' && null !== byoYomiChrono">
            + <strong>{{ byoYomiChrono.getRemainingPeriods() }}</strong> × {{ msToDuration(timeControlOptions.options.periodTime) }}</span>
    </p>
</template>

<style scoped lang="stylus">
.chrono-time
    font-size 1.75em
</style>
