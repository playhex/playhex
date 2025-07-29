<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import PageTournamentUpcoming from './PageTournamentUpcoming.vue';
import PageTournamentRunning from './PageTournamentRunning.vue';
import PageTournamentEnded from './PageTournamentEnded.vue';
import { t } from 'i18next';

const {
    tournament,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : t('tournament'),
});
</script>

<template>
    <template v-if="tournament">
        <PageTournamentUpcoming v-if="'created' === tournament.state" />
        <PageTournamentRunning v-else-if="'running' === tournament.state" />
        <PageTournamentEnded v-else="'ended' === tournament.state" />
    </template>

    <div v-else-if="null === tournament" class="container-fluid my-3">
        <p>{{ $t('loading_tournament') }}</p>
    </div>

    <div v-else-if="false === tournament" class="container-fluid my-3">
        <p>{{ $t('tournament_not_found') }}</p>
    </div>
</template>
