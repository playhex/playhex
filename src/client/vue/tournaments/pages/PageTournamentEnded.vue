<script setup lang="ts">
import { format } from 'date-fns';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import { tournamentBreadcrumb } from '../composables/tournamentBreadcrumb.js';
import AppTournamentHistorySection from '../components/AppTournamentHistorySection.vue';
import AppTournamentStandings from '../components/AppTournamentStandings.vue';
import AppTournamentFormat from '../components/AppTournamentFormat.vue';
import { getTopPlayers } from '../../../../shared/app/tournamentUtils.js';
import { formatDurationPrecision } from '../../../../shared/app/dateUtils.js';
import { computed } from 'vue';
import { Tournament } from '../../../../shared/app/models/index.js';
import AppTournamentPodium from '../components/AppTournamentPodium.vue';
import AppTournamentDescription from '../components/AppTournamentDescription.vue';
import AppTournamentOrganizerAndAdmins from '../components/AppTournamentOrganizerAndAdmins.vue';
import AppSeedingInfo from '../components/AppSeedingInfo.vue';
import AppTournamentExplorationAllowedInfo from '../components/AppTournamentExplorationAllowedInfo.vue';
import AppChannel from '../../components/AppChannel.vue';

const {
    tournament,
    slug,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});

const podiumPlayers = computed(() => {
    if (!tournament.value) {
        return null;
    }

    return getTopPlayers(tournament.value).map(participant => ({
        pseudo: participant.player.pseudo,
        rank: participant.rank ?? 0,
    }));
});

const formatTournamentDuration = (tournament: Tournament): string => {
    const start = tournament.startedAt;
    const end = tournament.endedAt;

    if (!start || !end) {
        return '-';
    }

    return formatDurationPrecision(start, end);
};

</script>

<template>
    <template v-if="tournament">
        <div class="container-fluid my-3">
            <AppBreadcrumb :items="tournamentBreadcrumb(tournament)" />

            <router-link
                :to="{ name: 'tournaments-create', query: { clone: slug } }"
                class="btn btn-sm btn-outline-success float-end ms-2"
            >
                {{ $t('clone_tournament') }}
            </router-link>

            <h1 class="m-0">{{ tournament.title }}</h1>

            <AppTournamentOrganizerAndAdmins :tournament />

            <p class="lead">{{ $t('tournament_ended_at', { date: tournament.endedAt ? format(tournament.endedAt, 'd MMMM yyyy p') : '-' }) }}</p>

            <AppTournamentPodium v-if="null !== podiumPlayers" :players="podiumPlayers" />

            <AppTournamentFormat :tournament />

            <AppTournamentExplorationAllowedInfo :tournament />

            <p>{{ $t('tournament_started_at', { date: tournament.startedAt ? format(tournament.startedAt, 'd MMMM yyyy p') : '-' }) }}</p>
            <p>{{ $t('tournament_duration', { duration: formatTournamentDuration(tournament) }) }}</p>
            <p>{{ $t('n_matches_played', { count: tournament.matches.length }) }}</p>
        </div>

        <AppTournamentBracket :tournament />

        <div class="container-fluid my-3">
            <p>
                <AppSeedingInfo :tournament />
            </p>
        </div>

        <div class="container-fluid my-3">
            <AppTournamentStandings :tournament />

            <AppTournamentDescription :tournament />

            <div class="row">
                <div class="col-md-6">
                    <AppChannel :channels="'tournament-' + tournament.slug" class="mb-3" />
                </div>
                <div class="col-md-6">
                    <AppTournamentHistorySection :tournament />
                </div>
            </div>
        </div>
    </template>
</template>
