<script setup lang="ts">
import { toRefs } from 'vue';
import { BIconRecordFill, BIconTrophy } from 'bootstrap-icons-vue';
import { Tournament } from '../../../../shared/app/models';
import AppMySubscriptionStatus from './AppMySubscriptionStatus.vue';
import AppCountdown from '../../components/AppCountdown.vue';
import AppTournamentStartsAt from './AppTournamentStartsAt.vue';
import { isCheckInOpen } from '../../../../shared/app/tournamentUtils';
import { useTournamentCurrentSubscription } from '../composables/tournamentCurrentSubscription';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournament } = toRefs(props);

const started = (): boolean => {
    return 'running' === tournament.value.state;
};

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

            <router-link
                :to="{ name: 'tournament', params: { slug: tournament.slug } }"
            >
                <template v-if="!started()">
                    {{ $t('view_tournament') }}
                </template>
                <template v-else>
                    <BIconRecordFill class="text-danger me-1" />
                    <span class="lead">{{ $t('now!') }}</span>
                </template>
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
