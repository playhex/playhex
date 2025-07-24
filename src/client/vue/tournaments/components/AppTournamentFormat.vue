<script setup lang="ts">
import AppTimeControlLabel from '../../components/AppTimeControlLabel.vue';
import { Tournament } from '../../../../shared/app/models';
import { timeControlToCadencyName } from '../../../../shared/app/timeControlUtils';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <p>
        <span>{{ $t('tournament_format.' + tournament.stage1Format) }}</span>
        <span class="separator text-secondary"></span>
        <span>{{ $t('time_cadency.' + timeControlToCadencyName(tournament)) }}</span>
        <span class="separator text-secondary"></span>
        <AppTimeControlLabel :timeControlBoardsize="tournament" :showIcon="false" :showAverage="false" />
        <span class="separator text-secondary"></span>
        <span>{{ tournament.boardsize }}×{{ tournament.boardsize }}</span>
    </p>
</template>

<style lang="stylus" scoped>
.separator
    margin 0 0.5em

    &::before
        content '•'
</style>
