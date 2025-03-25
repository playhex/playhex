<script setup lang="ts">
import { format } from 'date-fns';
import { useRoute } from 'vue-router';
import { apiGetTournament, apiPutTournamentSubscription } from '../../../apiClient';
import { Tournament } from '../../../../shared/app/models';
import { ref } from 'vue';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { byRank } from '../../../../shared/app/tournamentUtils.js';
import AppPseudo from '../../components/AppPseudo.vue';

const { slug } = useRoute().params;

if (Array.isArray(slug)) {
    throw new Error('Unexpected array in slug parameter');
}

const tournament = ref<null | false | Tournament>(null);

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});

(async () => {
    tournament.value = await apiGetTournament(slug) ?? false;
})();

const subscribe = () => {
    if (!tournament.value) {
        return;
    }

    apiPutTournamentSubscription(tournament.value.slug);
};
</script>

<template>
    <div class="container-fluid my-3">
        <template v-if="tournament">
            <h1>{{ tournament.title }}</h1>

            <p>Hosted by <AppPseudo :player="tournament.host" /></p>

            <p>Format: {{ tournament.stage1Format }}</p>

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

                <button class="btn btn-success" @click="subscribe">Subscribe</button>
            </template>

            <template v-else>
                <h2>Participants</h2>

                <ul>
                    <li
                        v-for="participant in tournament.participants.sort(byRank)"
                        :key="participant.player.publicId"
                    >
                        {{ participant.rank ?? '-' }} - <strong>{{ participant.player.pseudo }}</strong>: {{ participant.score ?? '-' }} points (tiebreak {{ participant.tiebreak ?? '-' }})
                    </li>
                </ul>
            </template>

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
