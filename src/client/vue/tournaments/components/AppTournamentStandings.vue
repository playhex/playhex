<script setup lang="ts">
import { Tournament } from '../../../../shared/app/models/index.js';
import AppStandingsDefault from './standings/AppStandingsDefault.vue';
import AppStandingsSingleElimination from './standings/AppStandingsSingleElimination.vue';
import AppStandingsDoubleElimination from './standings/AppStandingsDoubleElimination.vue';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <AppStandingsSingleElimination
        v-if="'single-elimination' === tournament.stage1Format"
        :tournament
    />
    <AppStandingsDoubleElimination
        v-else-if="'double-elimination' === tournament.stage1Format"
        :tournament
    />
    <AppStandingsDefault
        v-else
        :tournament
    />
</template>
