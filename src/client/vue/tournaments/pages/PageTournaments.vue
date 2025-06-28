<script setup lang="ts">
import { BIconPlus, BIconTrophyFill } from 'bootstrap-icons-vue';
import { ref } from 'vue';
import { Tournament } from '../../../../shared/app/models';
import { apiGetActiveTournaments, apiGetEndedTournaments } from '../../../apiClient';
import { intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n';

const activeTournaments = ref<null | Tournament[]>(null);
const endedTournaments = ref<null | Tournament[]>(null);

(async () => {
    activeTournaments.value = await apiGetActiveTournaments();
    endedTournaments.value = await apiGetEndedTournaments();
})();

const isIncoming = (tournament: Tournament): boolean => 'created' === tournament.state;
const isActive = (tournament: Tournament): boolean => 'running' === tournament.state;

const formatEndedAtDate = (date: Date): string => {
    return intlFormat(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }, {
        locale: autoLocale(),
    });
};
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

            <div class="row">
                <div
                    v-for="tournament in endedTournaments"
                    :key="tournament.publicId"
                    class="col-6 col-sm-4 col-md-3 col-xl-2"
                >
                    <div class="card text-center card-ended-tournament mb-4">
                        <div class="card-body">
                            <h5 class="card-title mb-0">
                                <router-link
                                    :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                                    class="text-body link stretched-link"
                                >{{ tournament.title }}</router-link>
                            </h5>
                            <p class="card-text text-body-secondary nb-participants">
                                <small>{{ tournament.participants.length }} participants</small>
                            </p>

                            <BIconTrophyFill class="text-warning bg-icon" />
                            <p class="m-0"><small>1st</small></p>
                            <p class="lead">{{ tournament.participants.find(p => 1 === p.rank)?.player.pseudo }}</p>

                            <p v-if="tournament.endedAt" class="card-text">
                                <small class="text-body-secondary">{{ formatEndedAtDate(tournament.endedAt) }}</small>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </template>


        <p v-else>Loading tournaments...</p>
    </div>
</template>

<style lang="stylus" scoped>
.card-ended-tournament
    .link
        text-decoration none

        &:hover
            text-decoration underline

    .bg-icon
        position absolute
        left 0
        right 0
        margin-inline auto
        width fit-content
        opacity .15
        font-size 4em
</style>
