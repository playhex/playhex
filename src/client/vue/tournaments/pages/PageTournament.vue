<script setup lang="ts">
import { format } from 'date-fns';
import { apiPutTournamentSubscription } from '../../../apiClient';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { byRank } from '../../../../shared/app/tournamentUtils.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppTimeControlLabel from '../../components/AppTimeControlLabel.vue';
import { useTournamentFromUrl } from '../../composables/useTournamentFromUrl.js';

const {
    tournament,
    slug,
    iAmHost,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});

const subscribeCheckIn = async () => {
    if (!tournament.value) {
        return;
    }

    const tournamentSubscription = await apiPutTournamentSubscription(tournament.value.slug);

    const displayedSubscription = tournament.value.subscriptions
        .find(subcription => subcription.player.publicId === tournamentSubscription.player.publicId)
    ;

    if (!displayedSubscription) {
        tournament.value.subscriptions.push(tournamentSubscription);
    } else {
        displayedSubscription.checkedIn = tournamentSubscription.checkedIn;
    }
};
</script>

<template>
    <div class="container-fluid my-3">
        <template v-if="tournament">
            <router-link
                v-if="iAmHost()"
                :to="{ name: 'tournament-manage', params: { slug }}"
                class="btn btn-outline-warning float-end"
            >
                Manage
            </router-link>

            <h1>{{ tournament.title }}</h1>

            <p>Hosted by <AppPseudo :player="tournament.host" /></p>

            <p>Format: <AppTimeControlLabel :timeControlBoardsize="tournament" /> {{ tournament.stage1Format }}</p>

            <p v-if="'created' === tournament.state">Starts at {{ format(tournament.startsAt, 'd MMMM yyyy p') }}</p>
            <p v-else-if="'running' === tournament.state" class="text-success">Now playing</p>
            <p v-else>Ended at {{ tournament.endedAt ? format(tournament.endedAt, 'd MMMM yyyy p') : '-' }}</p>

            <template v-if="'created' === tournament.state">
                <h2>Subscriptions</h2>

                <ul>
                    <li
                        v-for="subscription in tournament.subscriptions"
                        :key="subscription.player.publicId"
                    >{{ subscription.player.pseudo }} <span v-if="subscription.checkedIn">(checked-in)</span></li>
                </ul>

                <button class="btn btn-success" @click="subscribeCheckIn">Subscribe</button>
            </template>

            <template v-else>
                <h2>Participants</h2>

                <ul>
                    <li
                        v-for="participant in tournament.participants.sort(byRank)"
                        :key="participant.player.publicId"
                    >
                        {{ participant.rank ?? '-' }} - <strong>{{ participant.player.pseudo }}</strong>: {{ participant.score }} points (tiebreak {{ participant.tiebreak }})
                    </li>
                </ul>
            </template>

            <h2>History</h2>

            <ul>
                <li v-for="history, key in tournament.history" :key>
                    {{ $t('tournament_history.' + history.type, history.parameters) }} - {{ history.date }}
                </li>
            </ul>

            <AppTournamentBracket :tournament />
        </template>

        <template v-else-if="null === tournament">
            <p>Loading tournament</p>
        </template>

        <template v-else-if="false === tournament">
            <p>Tournament not found</p>
        </template>
    </div>
</template>
