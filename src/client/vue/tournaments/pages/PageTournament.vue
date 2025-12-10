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
        <PageTournamentUpcoming v-if="tournament.state === 'created'" />
        <PageTournamentRunning v-else-if="tournament.state === 'running'" />
        <PageTournamentEnded v-else-if="tournament.state === 'ended'" />

        <template v-else-if="tournament.state === 'canceled'">
            <div class="container my-3">
                <p class="display-4 text-warning">Canceled tournament</p>
            </div>

            <PageTournamentUpcoming v-if="tournament.startedAt === null" />
            <PageTournamentRunning v-else />
        </template>
    </template>

    <div v-else-if="null === tournament" class="container-fluid my-3">
        <p>{{ $t('loading_tournament') }}</p>
    </div>

    <div v-else-if="false === tournament" class="container-fluid my-3">
        <p>{{ $t('tournament_not_found') }}</p>
    </div>
</template>
