<script setup lang="ts">
import { timeControlToCadencyName, timeControlToString } from '@shared/app/timeControlUtils';
import { PropType, toRefs } from 'vue';
import { BIconLightningChargeFill, BIconAlarmFill, BIconCalendar } from 'bootstrap-icons-vue';
import HostedGameOptions from '../../../shared/app/models/HostedGameOptions';
import { calcAverageSecondsPerMove } from '@shared/app/timeControlUtils';
import { secondsToDuration } from '@shared/app/timeControlUtils';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
});

const { gameOptions } = toRefs(props);

const candency = timeControlToCadencyName(gameOptions.value);
</script>

<template>
    <span>
        <BIconLightningChargeFill v-if="candency === 'blitz'" class="d-none d-sm-inline" />
        <BIconAlarmFill v-else-if="candency === 'normal'" class="d-none d-sm-inline" />
        <BIconCalendar v-else-if="candency === 'correspondance'" class="d-none d-sm-inline" />

        {{ timeControlToString(gameOptions.timeControl) }}

        <small class="text-body-secondary d-none d-sm-inline">(~{{ secondsToDuration(Math.round(calcAverageSecondsPerMove(gameOptions.timeControl, gameOptions.boardsize)), 1) }}&nbsp;/&nbsp;{{ $t('move') }})</small>
    </span>
</template>

<style lang="stylus" scoped>
span
    margin 0
</style>
