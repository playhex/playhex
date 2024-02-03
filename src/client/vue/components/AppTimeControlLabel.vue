<script setup lang="ts">
import { timeControlToCadencyName, timeControlToString } from '@shared/app/timeControlUtils';
import { PropType, toRefs } from 'vue';
import { BIconLightningChargeFill, BIconAlarmFill, BIconCalendar } from 'bootstrap-icons-vue';
import { GameOptionsData } from '@shared/app/GameOptions';
import { calcAverageSecondsPerMove } from '@shared/app/timeControlUtils';
import { secondsToDuration } from '@shared/app/timeControlUtils';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<GameOptionsData>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);

const candency = timeControlToCadencyName(gameOptions.value);
</script>

<template>
    <b-icon-lightning-charge-fill v-if="candency === 'blitz'" />
    <b-icon-alarm-fill v-else-if="candency === 'normal'" />
    <b-icon-calendar v-else-if="candency === 'correspondance'" />

    {{ timeControlToString(gameOptions.timeControl) }}

    <small class="text-body-secondary d-none d-sm-inline">(~{{ secondsToDuration(Math.round(calcAverageSecondsPerMove(gameOptions.timeControl, gameOptions.boardsize)), 1) }}&nbsp;/&nbsp;move)</small>
</template>
