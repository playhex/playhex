<script setup lang="ts">
import { format } from 'date-fns';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppTournamentHistorySection from '../components/AppTournamentHistorySection.vue';
import AppTournamentStandings from '../components/AppTournamentStandings.vue';
import AppTournamentFormat from '../components/AppTournamentFormat.vue';
import { getTopPlayers } from '../../../../shared/app/tournamentUtils';
import { formatDurationPrecision } from '../../../../shared/app/dateUtils';
import { computed } from 'vue';
import { Tournament, TournamentParticipant } from '../../../../shared/app/models';
import i18n from 'i18next';
import AppTournamentDescription from '../components/AppTournamentDescription.vue';

const {
    tournament,
    slug,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});

const topPlayers = computed(() => {
    if (!tournament.value) {
        return null;
    }

    return getTopPlayers(tournament.value);
});

const formatTournamentDuration = (tournament: Tournament): string => {
    const start = tournament.startedAt;
    const end = tournament.endedAt;

    if (!start || !end) {
        return '-';
    }

    return formatDurationPrecision(start, end);
};

const getTournamentOrdinal = (tournamentParticipant: TournamentParticipant): string => {
    const { rank } = tournamentParticipant;

    if (!rank) {
        return '-';
    }

    if (rank < 1 || rank > 3) {
        return '' + rank;
    }

    return i18n.t('tournament_ordinal.' + rank);
};

const isFirst = (tournamentParticipant: TournamentParticipant): boolean => {
    return tournamentParticipant.rank === 1;
};

const colClasses = [
    'col-12 col-lg-6 order-lg-2',
    'col-12 col-sm-6 col-lg-3 order-lg-1',
    'col-12 col-sm-6 col-lg-3 order-lg-3',
];
</script>

<template>
    <template v-if="tournament">
        <div class="container-fluid my-3">
            <router-link
                :to="{ name: 'tournaments-create', hash: '#clone-' + slug }"
                class="btn btn-sm btn-outline-success float-end ms-2"
            >
                {{ $t('clone_tournament') }}
            </router-link>

            <h1 class="m-0">{{ tournament.title }}</h1>

            <p><small>
                <i18next :translation="$t('tournament_organized_by')">
                    <template #player>
                        <AppPseudo :player="tournament.organizer" is="strong" />
                    </template>
                </i18next>
            </small></p>

            <p class="lead">{{ $t('tournament_ended_at', { date: tournament.endedAt ? format(tournament.endedAt, 'd MMMM yyyy p') : '-' }) }}</p>

            <div v-if="null !== topPlayers" class="row">
                <div
                    v-for="topPlayer, i of topPlayers"
                    :class="colClasses[i]"
                    class="mb-3"
                >
                    <div class="card h-100" :class="{ 'border-warning shadow-sm': isFirst(topPlayer) }">
                        <div class="card-body text-center">
                            <p class="mb-0" :class="{ 'text-warning': isFirst(topPlayer) }">{{ getTournamentOrdinal(topPlayer) }}</p>
                            <p class="display-6">{{ topPlayer.player.pseudo }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <AppTournamentFormat :tournament />

            <p>{{ $t('tournament_started_at', { date: tournament.startedAt ? format(tournament.startedAt, 'd MMMM yyyy p') : '-' }) }}</p>
            <p>{{ $t('tournament_duration', { duration: formatTournamentDuration(tournament) }) }}</p>
            <p>{{ $t('n_matches_played', { count: tournament.matches.length }) }}</p>
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
