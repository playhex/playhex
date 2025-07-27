<script setup lang="ts">
import { toRefs } from 'vue';
import { BIconPeopleFill, BIconRecordFill, BIconTrophy } from 'bootstrap-icons-vue';
import { Tournament } from '../../../../shared/app/models';
import AppMySubscriptionStatus from './AppMySubscriptionStatus.vue';
import AppCountdown from '../../components/AppCountdown.vue';
import AppTournamentStartsAt from './AppTournamentStartsAt.vue';
import { getActiveTournamentMatches, isCheckInOpen } from '../../../../shared/app/tournamentUtils';
import { useTournamentCurrentSubscription } from '../composables/tournamentCurrentSubscription';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournament } = toRefs(props);

const {
    currentTournamentSubscription,
    subscribeCheckIn,
} = useTournamentCurrentSubscription(tournament);
</script>

<template>
    <div class="card card-bg-icon border-warning mb-4">
        <BIconTrophy class="bg-trophy text-warning" />
        <div class="card-body">
            <h6 class="card-subtitle text-body-secondary">{{ $t('tournament') }}</h6>
            <h4 class="card-title">{{ tournament.title }}</h4>

            <!-- Upcoming -->
            <template v-if="tournament.state === 'created'">
                <p class="card-text">
                    <AppTournamentStartsAt :tournament format="short" />
                    <span class="text-body-secondary"> (<AppCountdown :date="tournament.startOfficialAt" />)</span>
                </p>

                <!-- subscribe / ckeck-in / unsubscribe -->
                <button
                    v-if="!isCheckInOpen(tournament) && null === currentTournamentSubscription"
                    @click="subscribeCheckIn"
                    class="btn btn-success"
                >{{ $t('tournament_subscribe') }}</button>

                <button
                    v-if="isCheckInOpen(tournament) && (null === currentTournamentSubscription || !currentTournamentSubscription.checkedIn)"
                    @click="subscribeCheckIn"
                    class="btn btn-success me-3"
                >{{ $t('tournament_checkin') }}</button>

                <p v-if="tournament.subscriptions.length > 0" class="card-text">
                    <small>{{ $t('n_people_are_interested', { count: tournament.subscriptions.length }) }}</small>
                </p>

                <!-- Current player status on this tournament -->
                <p><AppMySubscriptionStatus :tournament /></p>
            </template>

            <!-- Running -->
            <template v-else-if="tournament.state === 'running'">
                <p class="card-text">
                    <BIconPeopleFill />
                    {{ $t('n_participants', { count: tournament.participants.length }) }}
                </p>

                <p class="card-text lead">
                    <BIconRecordFill class="text-danger" />
                    {{ $t('n_playing_games', { count: getActiveTournamentMatches(tournament).length }) }}
                </p>
            </template>

            <!-- Ended -->
            <template v-else-if="tournament.state === 'ended'">
                <p class="m-0"><small>{{ $t('tournament_ordinal.1') }}</small></p>
                <p class="lead">{{ tournament.participants.find(p => 1 === p.rank)?.player.pseudo }}</p>
            </template>

            <router-link
                :to="{ name: 'tournament', params: { slug: tournament.slug } }"
            >
                {{ $t('view_tournament') }}
            </router-link>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.bg-trophy
    top 1rem
    right 0.5rem
    font-size 8rem

    + .card-body
        position relative // place body in front of background icon
</style>
