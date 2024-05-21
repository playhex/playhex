<script setup lang="ts">
/* eslint-env browser */
import TimeValue, { timeValueToSeconds } from '@shared/time-control/TimeValue';
import { PropType, onUnmounted, ref, toRefs, watch } from 'vue';
import { PlayerTimeData } from '@shared/time-control/TimeControl';
import { ByoYomiPlayerTimeData } from '@shared/time-control/time-controls/ByoYomiTimeControl';
import TimeControlType from '@shared/time-control/TimeControlType';
import { ByoYomiChrono } from '@shared/time-control/ByoYomiChrono';
import { secondsToDuration, secondsToTime } from '@shared/app/timeControlUtils';

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
};

const toChrono = (timeValue: TimeValue): ChronoData => {
    let seconds = timeValueToSeconds(timeValue, new Date());
    const { floor } = Math;
    let sign = '';

    if (seconds < 0) {
        seconds = -seconds;
        sign = '-';
    }

    const chrono: ChronoData = {
        time: `${sign}${secondsToTime(seconds)}`,
    };

    if (seconds < 10) {
        chrono.ms = `.${floor((seconds % 1) * 10)}`;
    }

    return chrono;
};

const chronoDisplay = ref<ChronoData>({ time: '…' });

let byoYomiChrono: null | ByoYomiChrono = null;

if ('byoyomi' === timeControlOptions.value.type) {
    const { initialSeconds, periodSeconds, periodsCount } = timeControlOptions.value.options;
    const { remainingMainTime, remainingPeriods } = (playerTimeData.value as ByoYomiPlayerTimeData);

    byoYomiChrono = new ByoYomiChrono(initialSeconds, periodSeconds, periodsCount);

    byoYomiChrono.setMainValue(remainingMainTime);
    byoYomiChrono.setRemainingPeriods(remainingPeriods);

    watch(playerTimeData, (newValue: ByoYomiPlayerTimeData) => {
        if (null === byoYomiChrono) {
            return;
        }

        byoYomiChrono.setMainValue(newValue.remainingMainTime);
        byoYomiChrono.setRemainingPeriods(newValue.remainingPeriods);
    });
}

const chronoThread = setInterval(() => {
    chronoDisplay.value = toChrono(null !== byoYomiChrono
        ? byoYomiChrono.getMainValue()
        : playerTimeData.value.totalRemainingTime
    );
}, 50);

onUnmounted(() => clearInterval(chronoThread));
</script>

<template>
    <p>
        <span class="chrono-time">{{ chronoDisplay.time }}</span>
        <span v-if="chronoDisplay.ms">{{ chronoDisplay.ms }}</span>
        <span v-if="timeControlOptions.type === 'byoyomi' && null !== byoYomiChrono">
            + <strong>{{ byoYomiChrono.getRemainingPeriods() }}</strong> × {{ secondsToDuration(timeControlOptions.options.periodSeconds) }}</span>
    </p>
</template>

<style scoped lang="stylus">
.chrono-time
    font-size 1.75em
</style>
