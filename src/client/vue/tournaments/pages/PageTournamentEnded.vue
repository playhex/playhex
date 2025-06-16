<script setup lang="ts">
import { format } from 'date-fns';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { byRank } from '../../../../shared/app/tournamentUtils.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppTimeControlLabel from '../../components/AppTimeControlLabel.vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';

const {
    tournament,
    slug,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});
</script>

<template>
    <template v-if="tournament">
        <div class="container-fluid my-3">
            <router-link
                :to="{ name: 'tournaments-create', hash: '#clone-' + slug }"
                class="btn btn-outline-success float-end ms-2"
            >
                Clone
            </router-link>

            <h1>{{ tournament.title }}</h1>

            <p>Hosted by <AppPseudo :player="tournament.host" /></p>

            <p>Format: <AppTimeControlLabel :timeControlBoardsize="tournament" /> {{ tournament.stage1Format }}</p>

            <p>Ended at {{ tournament.endedAt ? format(tournament.endedAt, 'd MMMM yyyy p') : '-' }}</p>
        </div>

        <AppTournamentBracket :tournament />

        <div class="container-fluid my-3">
            <h2>Participants</h2>

            <ul>
                <li
                    v-for="participant in tournament.participants.sort(byRank)"
                    :key="participant.player.publicId"
                >
                    {{ participant.rank ?? '-' }} - <strong>{{ participant.player.pseudo }}</strong>: {{ participant.score }} points (tiebreak {{ participant.tiebreak }})
                </li>
            </ul>

            <template v-if="tournament.description">
                <h2>Description</h2>
                <p class="tournament-description">{{ tournament.description }}</p>
            </template>

            <h2>History</h2>

            <ul>
                <li v-for="history, key in tournament.history" :key>
                    {{ $t('tournament_history.' + history.type, history.parameters) }} - {{ history.date }}
                </li>
            </ul>
        </div>
    </template>
</template>

<style lang="stylus" scoped>
.tournament-description
    white-space pre-line
</style>
