<script setup lang="ts">
import { Tournament } from '../../../../shared/app/models';
import AppStandingsDefault from './standings/AppStandingsDefault.vue';
import AppStandingsDoubleElimination from './standings/AppStandingsDoubleElimination.vue';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <AppStandingsDoubleElimination
        v-if="'double-elimination' === tournament.stage1Format"
        :tournament
    />
    <AppStandingsDefault
        v-else
        :tournament
    />
</template>
