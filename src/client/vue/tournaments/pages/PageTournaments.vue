<script setup lang="ts">
import { BIconPlus } from 'bootstrap-icons-vue';
import { ref } from 'vue';
import { Tournament } from '../../../../shared/app/models';
import { apiGetTournaments } from '../../../apiClient';

const tournaments = ref<null | Tournament[]>(null);

(async () => {
    tournaments.value = await apiGetTournaments();
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

        <template v-if="null !== tournaments">
            <h2>Active tounaments</h2>

            <ul>
                <router-link
                    v-for="tournament in tournaments.filter(isActive)"
                    :key="tournament.publicId"
                    :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                >{{ tournament.title }}</router-link>
            </ul>

            <h2>Incoming tounaments</h2>

            <ul>
                <router-link
                    v-for="tournament in tournaments.filter(isIncoming)"
                    :key="tournament.publicId"
                    :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                >{{ tournament.title }}</router-link>
            </ul>

            <h2>Past tounaments</h2>

            <ul>
                <router-link
                    v-for="tournament in tournaments.filter(isPast)"
                    :key="tournament.publicId"
                    :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                >{{ tournament.title }}</router-link>
            </ul>
        </template>


        <p v-else>Loading tournaments...</p>
    </div>
</template>
