<script setup lang="ts">
import { timeControlToCadencyName, timeControlToString } from '../../../shared/app/timeControlUtils.js';
import { PropType } from 'vue';
import { BIconLightningChargeFill, BIconAlarmFill, BIconCalendar } from 'bootstrap-icons-vue';
import { calcAverageSecondsPerMove } from '../../../shared/app/timeControlUtils.js';
import { msToDuration } from '../../../shared/app/timeControlUtils.js';
import { TimeControlBoardsize } from '../../../shared/app/models/TimeControlBoardsize.js';

const props = defineProps({
    timeControlBoardsize: {
        type: Object as PropType<TimeControlBoardsize>,
        required: true,
    },

    /**
     * Whether to show an icon next to time control,
     * that represents the type of the time cadency:
     * a blitz, live or correspondence icon.
     */
    showIcon: {
        type: Boolean,
        required: false,
        default: true,
    },

    /**
     * Whether to show average time to play a move.
     * Gives an indication of how fast the game may be.
     */
    showAverage: {
        type: Boolean,
        required: false,
        default: true,
    },
});

const cadency = timeControlToCadencyName(props.timeControlBoardsize);
</script>

<template>
    <span>
        <span v-if="showIcon" class="d-none d-sm-inline">
            <BIconLightningChargeFill v-if="cadency === 'blitz'" />
            <BIconAlarmFill v-else-if="cadency === 'normal'" />
            <BIconCalendar v-else-if="cadency === 'correspondence'" />
            <span>&nbsp;</span>
        </span>

        <span>{{ timeControlToString(timeControlBoardsize.timeControl) }}</span>

        <template v-if="showAverage">
            <small class="text-body-secondary d-none d-sm-inline">(~{{ msToDuration(1000 * Math.round(calcAverageSecondsPerMove(timeControlBoardsize.timeControl, timeControlBoardsize.boardsize)), 1) }}&nbsp;/&nbsp;{{ $t('move') }})</small>
        </template>
    </span>
</template>

<style lang="stylus" scoped>
span
    margin 0
</style>
