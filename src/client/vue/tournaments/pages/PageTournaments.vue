<script setup lang="ts">
import { BIconPlus } from 'bootstrap-icons-vue';
import { ref } from 'vue';
import { Tournament } from '../../../../shared/app/models';
import { apiGetActiveTournaments, apiGetEndedTournaments } from '../../../apiClient';

const activeTournaments = ref<null | Tournament[]>(null);
const endedTournaments = ref<null | Tournament[]>(null);

(async () => {
    activeTournaments.value = await apiGetActiveTournaments();
    endedTournaments.value = await apiGetEndedTournaments();
})();

const isIncoming = (tournament: Tournament): boolean => 'created' === tournament.state;
const isActive = (tournament: Tournament): boolean => 'running' === tournament.state;
const isPast = (tournament: Tournament): boolean => 'ended' === tournament.state;
</script>

<template>
    <div class="container-fluid my-3">
        <div class="d-sm-flex justify-content-between">
            <h1>Tournaments</h1>

            <div>
                <router-link :to="{ name: 'tournaments-create' }" class="btn btn-sm btn-outline-success float-end">
                    <BIconPlus />
                    Host tournament
                </router-link>
            </div>
        </div>

        <template v-if="null !== activeTournaments">
            <h2>Active tournaments</h2>

            <ul>
                <li v-for="tournament in activeTournaments.filter(isActive)" :key="tournament.publicId">
                    <router-link :to="{ name: 'tournament', params: { slug: tournament.slug } }">{{ tournament.title }}</router-link>
                </li>
            </ul>

            <h2>Incoming tournaments</h2>

            <ul>
                <li v-for="tournament in activeTournaments.filter(isIncoming)" :key="tournament.publicId">
                    <router-link :to="{ name: 'tournament', params: { slug: tournament.slug } }">{{ tournament.title }}</router-link>
                </li>
            </ul>

            <h2>Past tournaments</h2>

            <ul>
                <li v-for="tournament in endedTournaments" :key="tournament.publicId">
                    <router-link :to="{ name: 'tournament', params: { slug: tournament.slug } }">{{ tournament.title }}</router-link>
                    - {{  tournament.participants.length }} participants
                    - winner {{ tournament.participants.filter(p => 1 === p.rank).map(p => p.player.pseudo).join(', ') }}
                    - {{ tournament.stage1Format }}
                    - ended at {{ tournament.endedAt }}
                </li>
            </ul>
        </template>


        <p v-else>Loading tournaments...</p>
    </div>
</template>
