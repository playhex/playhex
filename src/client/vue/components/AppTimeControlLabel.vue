<script setup lang="ts">
import { TimeControlBoardsize, timeControlToCadencyName, timeControlToString } from '../../../shared/app/timeControlUtils.js';
import { PropType } from 'vue';
import { BIconLightningChargeFill, BIconAlarmFill, BIconCalendar } from 'bootstrap-icons-vue';
import { calcAverageSecondsPerMove } from '../../../shared/app/timeControlUtils.js';
import { msToDuration } from '../../../shared/app/timeControlUtils.js';

const props = defineProps({
    timeControlBoardsize: {
        type: Object as PropType<TimeControlBoardsize>,
        required: true,
    },
});

const cadency = timeControlToCadencyName(props.timeControlBoardsize);
</script>

<template>
    <span>
        <BIconLightningChargeFill v-if="cadency === 'blitz'" class="d-none d-sm-inline" />
        <BIconAlarmFill v-else-if="cadency === 'normal'" class="d-none d-sm-inline" />
        <BIconCalendar v-else-if="cadency === 'correspondence'" class="d-none d-sm-inline" />

        {{ timeControlToString(timeControlBoardsize.timeControl) }}

        <small class="text-body-secondary d-none d-sm-inline">(~{{ msToDuration(1000 * Math.round(calcAverageSecondsPerMove(timeControlBoardsize.timeControl, timeControlBoardsize.boardsize)), 1) }}&nbsp;/&nbsp;{{ $t('move') }})</small>
    </span>
</template>

<style lang="stylus" scoped>
span
    margin 0
</style>
