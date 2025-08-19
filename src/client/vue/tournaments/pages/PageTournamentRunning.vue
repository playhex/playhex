<script setup lang="ts">
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import AppTournamentHistorySection from '../components/AppTournamentHistorySection.vue';
import AppTournamentStandings from '../components/AppTournamentStandings.vue';
import AppTournamentFormat from '../components/AppTournamentFormat.vue';
import { IconRecordFill } from '../../icons.js';
import { getActiveTournamentMatches } from '../../../../shared/app/tournamentUtils';
import AppTournamentDescription from '../components/AppTournamentDescription.vue';
import AppTournamentOrganizerAndAdmins from '../components/AppTournamentOrganizerAndAdmins.vue';

const {
    tournament,
    slug,
    iAmHost,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});
</script>

<template>
    <template v-if="tournament">
        <div class="container-fluid my-3">
            <router-link
                v-if="iAmHost()"
                :to="{ name: 'tournament-manage', params: { slug } }"
                class="btn btn-sm btn-outline-warning float-end ms-2"
            >
                {{ $t('manage_tournament') }}
            </router-link>

            <router-link
                :to="{ name: 'tournaments-create', hash: '#clone-' + slug }"
                class="btn btn-sm btn-outline-success float-end ms-2"
            >
                {{ $t('clone_tournament') }}
            </router-link>

            <h1 class="m-0">{{ tournament.title }}</h1>

            <AppTournamentOrganizerAndAdmins :tournament />

            <AppTournamentFormat :tournament />

            <p class="card-text lead">
                <IconRecordFill class="text-danger" />
                {{ $t('n_playing_games', { count: getActiveTournamentMatches(tournament).length }) }}
            </p>
        </div>

        <AppTournamentBracket :tournament />

        <div class="container-fluid my-3">
            <h2>{{ $t('n_participants', { count: tournament.participants.length }) }}</h2>

            <AppTournamentStandings :tournament />

            <AppTournamentDescription :tournament />

            <AppTournamentHistorySection :tournament />
        </div>
    </template>
</template>
