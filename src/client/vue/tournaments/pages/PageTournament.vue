<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import PageTournamentIncoming from './PageTournamentIncoming.vue';
import PageTournamentRunning from './PageTournamentRunning.vue';
import PageTournamentEnded from './PageTournamentEnded.vue';

const {
    tournament,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});
</script>

<template>
    <template v-if="tournament">
        <PageTournamentIncoming v-if="'created' === tournament.state" />
        <PageTournamentRunning v-else-if="'running' === tournament.state" />
        <PageTournamentEnded v-else="'ended' === tournament.state" />
    </template>

    <div v-else-if="null === tournament" class="container-fluid my-3">
        <p>Loading tournament</p>
    </div>

    <div v-else-if="false === tournament" class="container-fluid my-3">
        <p>Tournament not found</p>
    </div>
</template>
