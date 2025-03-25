<script setup lang="ts">
import { format } from 'date-fns';
import { useRoute } from 'vue-router';
import { apiGetTournament } from '../../../apiClient';
import { Tournament } from '../../../../shared/app/models';
import { ref } from 'vue';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';

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
</script>

<template>
    <div class="container-fluid my-3">
        <template v-if="tournament">
            <h1>{{ tournament.title }}</h1>

            <p v-if="'created' === tournament.state">Starts at {{ format(tournament.startsAt, 'd MMMM yyyy p') }}</p>
            <p v-else-if="'running' === tournament.state" class="text-success">Now playing</p>
            <p v-else>Ended at {{ tournament.endedAt ? format(tournament.endedAt, 'd MMMM yyyy p') : '-' }}</p>

            <h2>Participants</h2>

            <ul>
                <li
                    v-for="participant in tournament.participants"
                    :key="participant.player.publicId"
                >{{ participant.player.pseudo }}</li>
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
