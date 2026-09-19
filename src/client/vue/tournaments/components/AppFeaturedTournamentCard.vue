<script setup lang="ts">
import { toRefs } from 'vue';
import { IconBell, IconPeopleFill, IconPlayFill, IconTrophy, IconTrophyFill } from '../../icons.js';
import { Tournament } from '../../../../shared/app/models/index.js';
import AppMySubscriptionStatus from './AppMySubscriptionStatus.vue';
import AppCountdown from '../../components/AppCountdown.vue';
import AppTournamentStartsAt from './AppTournamentStartsAt.vue';
import { getActiveTournamentMatches, isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';
import { useTournamentCurrentSubscription } from '../composables/tournamentCurrentSubscription.js';
import AppChannelMessagesCount from '../../components/AppChannelMessagesCount.vue';
import { useEnableNotificationsAfterTournamentSubscribe } from '../../composables/enableNotificationsAfterTournamentSubscribe.js';

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

const { promptIfNeeded } = useEnableNotificationsAfterTournamentSubscribe('tournament_checkin_opens');

const subscribeAndPrompt = async () => {
    void subscribeCheckIn();
    await promptIfNeeded();
};
</script>

<template>
    <!-- Upcoming: highlighted card -->
    <router-link
        v-if="tournament.state === 'created'"
        :to="{ name: 'tournament', params: { slug: tournament.slug } }"
        class="card card-bg-icon text-decoration-none border-warning mb-4"
    >
        <IconTrophy class="bg-trophy text-warning" />
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
                @click.prevent="subscribeAndPrompt"
                class="btn btn-sm btn-outline-info"
            ><IconBell /> {{ $t('tournament_subscribe') }}</button>

            <button
                v-if="isCheckInOpen(tournament) && (null === currentTournamentSubscription || !currentTournamentSubscription.checkedIn)"
                @click.prevent="subscribeAndPrompt"
                class="btn btn-success me-3"
            >{{ $t('tournament_checkin') }}</button>

            <!-- Current player status on this tournament -->
            <p class="card-text mb-3">
                <AppMySubscriptionStatus :tournament />
            </p>

            <p v-if="tournament.subscriptions.length > 0" class="card-text">
                <small><IconPeopleFill /> {{ $t('n_interested', { count: tournament.subscriptions.length }) }}</small>
                <span class="text-secondary mx-2">•</span>
                <small><AppChannelMessagesCount :channel="'tournament-' + tournament.slug" /></small>
            </p>
        </div>
    </router-link>

    <!-- Running -->
    <router-link
        v-else-if="tournament.state === 'running'"
        :to="{ name: 'tournament', params: { slug: tournament.slug } }"
        class="card text-decoration-none mb-2"
    >
        <div class="card-body py-2">
            <p class="m-0">
                <IconPlayFill class="text-danger" />
                {{ tournament.title }}
            </p>
            <p class="m-0 text-body-secondary">
                <small>{{ $t('n_playing_games', { count: getActiveTournamentMatches(tournament).length }) }}</small>
                <span class="mx-2">•</span>
                <small><IconPeopleFill /> {{ $t('n_participants', { count: tournament.participants.length }) }}</small>
                <span class="mx-2">•</span>
                <small><AppChannelMessagesCount :channel="'tournament-' + tournament.slug" /></small>
            </p>
        </div>
    </router-link>

    <!-- Ended -->
    <router-link
        v-else-if="tournament.state === 'ended'"
        :to="{ name: 'tournament', params: { slug: tournament.slug } }"
        class="card text-decoration-none mb-2"
    >
        <div class="card-body py-2">
            <p class="m-0">
                {{ tournament.title }}
                <span class="text-body-secondary"><small>({{ $t('tournament_ended') }})</small></span>
            </p>
            <p class="m-0">
                <IconTrophyFill class="text-warning" />
                {{ tournament.participants.find(p => 1 === p.rank)?.player.pseudo }}
            </p>
        </div>
    </router-link>
</template>

<style lang="stylus" scoped>
.bg-trophy
    top 1rem
    right 0.5rem
    font-size 8rem

    + .card-body
        position relative // place body in front of background icon
</style>
