<script setup lang="ts">
import { formatDistance } from 'date-fns';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';
import AppTimeControlLabel from '../../components/AppTimeControlLabel.vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
import useAuthStore from '../../../stores/authStore';
import i18n from 'i18next';
import AppCountdown from '../../components/AppCountdown.vue';
import AppTournamentFormatImage from '../components/AppTournamentFormatImage.vue';
import { timeControlToCadencyName } from '../../../../shared/app/timeControlUtils';
import { BIconCalendarEvent, BIconExclamationTriangleFill, BIconPeopleFill } from 'bootstrap-icons-vue';
import AppPseudo from '../../components/AppPseudo.vue';
import AppTournamentHistorySection from '../components/AppTournamentHistorySection.vue';
import { useTournamentCurrentSubscription } from '../composables/tournamentCurrentSubscription';
import AppMySubscriptionStatus from '../components/AppMySubscriptionStatus.vue';
import AppTournamentStartsAt from '../components/AppTournamentStartsAt.vue';

const {
    tournament,
    slug,
    iAmHost,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : i18n.t('tournament'),
});

const { loggedInPlayer } = storeToRefs(useAuthStore());

const {
    currentTournamentSubscription,
    subscribeCheckIn,
    unsub,
} = useTournamentCurrentSubscription(tournament);

const duration = (s: number) => formatDistance(0, s * 1000, { includeSeconds: true });
</script>

<template>
    <template v-if="tournament">
        <div class="container my-3">
            <router-link
                v-if="iAmHost()"
                :to="{ name: 'tournament-manage', params: { slug } }"
                class="btn btn-sm btn-outline-warning float-end ms-2"
            >
                {{ $t('manage_tournament') }}
            </router-link>

            <router-link
                :to="{ name: 'tournaments-create', hash: '#clone-' + slug }"
                class="btn btn-sm btn-outline-success float-end ms-2"
            >
                {{ $t('clone_tournament') }}
            </router-link>

            <h1 class="display-4 m-0">{{ tournament.title }}</h1>

            <p><small>
                <i18next :translation="$t('tournament_organized_by')">
                    <template #player>
                        <AppPseudo :player="tournament.organizer" is="strong" />
                    </template>
                </i18next>
            </small></p>

            <div class="row">
                <div class="col-md-6 mb-3">

                    <!-- Tournament date -->
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">
                                <BIconCalendarEvent class="me-1" />
                                <AppTournamentStartsAt :tournament class="ms-2" />
                            </h5>
                            <p class="text-secondary">
                                <small><AppCountdown :date="tournament.startOfficialAt" /></small>
                            </p>

                            <p v-if="!isCheckInOpen(tournament)" class="card-text">{{ $t('checkin_opens_time_before', { time: duration(tournament.checkInOpenOffsetSeconds) }) }}</p>
                            <p v-else>Check-in period is open!</p>

                            <p class="card-text" v-if="0 === tournament.startDelayInSeconds">Tournament will start automatically</p>
                            <p class="card-text" v-else-if="tournament.startDelayInSeconds > 0">Tournament will be started manually by organizer, or automatically {{ tournament.startDelayInSeconds }} seconds later.</p>
                            <p class="card-text" v-else-if="tournament.startDelayInSeconds < 0">Tournament will be started manually by organizer only.</p>
                        </div>
                    </div>

                </div>
                <div class="col-md-6 mb-3">

                    <!-- Tournament format -->
                    <div class="card h-100 shadow-sm">
                        <div class="row">
                            <div class="col-4 col-lg-3">
                                <AppTournamentFormatImage :format="tournament.stage1Format" class="m-3" />
                            </div>
                            <div class="col-8 col-lg-9">
                                <div class="card-body">
                                    <h5 class="card-title">{{ $t('tournament_format.' + tournament.stage1Format) }}</h5>

                                    <h6
                                        v-if="'swiss' === tournament.stage1Format && null !== tournament.stage1Rounds"
                                        class="card-subtitle mb-2 text-body-secondary"
                                    >{{ $t('n_rounds', { count: tournament.stage1Rounds }) }}</h6>
                                    <h6
                                        v-if="'swiss' === tournament.stage1Format && null === tournament.stage1Rounds"
                                        class="card-subtitle mb-2 text-body-secondary"
                                    >{{ $t('rounds_number_auto') }}</h6>

                                    <h6
                                        v-if="'single-elimination' === tournament.stage1Format && tournament.consolation"
                                        class="card-subtitle mb-2 text-body-secondary"
                                    >{{ $t('consolation_enabled') }}</h6>
                                    <h6
                                        v-if="'single-elimination' === tournament.stage1Format && !tournament.consolation"
                                        class="card-subtitle mb-2 text-body-secondary"
                                    >{{ $t('consolation_disabled') }}</h6>

                                    <p class="card-text">
                                        {{ $t('time_cadency.' + timeControlToCadencyName(tournament)) }}
                                        <br>
                                        <AppTimeControlLabel :timeControlBoardsize="tournament" />
                                        <br>
                                        <span class="lead">{{ tournament.boardsize }}×{{ tournament.boardsize }}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                <div class="col-12">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title"><BIconPeopleFill class="me-1" /> {{ $t('participants') }}</h5>
                            <p v-if="!isCheckInOpen(tournament)" class="card-text">
                                {{ $t('n_people_are_interested', { count: tournament.subscriptions.length }) }}
                            </p>
                            <p v-else class="card-text">
                                {{ $t('n_people_are_interested', { count: tournament.subscriptions.filter(subscription => subscription.checkedIn).length }) }}
                            </p>

                            <!-- subscribe / ckeck-in / unsubscribe -->
                            <p class="card-text mb-1">
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

                                <!-- do not display if "Check-in" is displayed to prevent 2 buttons -->
                                <button
                                    v-else-if="null !== currentTournamentSubscription"
                                    @click="unsub"
                                    class="btn btn-outline-danger"
                                >{{ $t('tournament_unsubscribe') }}</button>
                            </p>

                            <!-- Current player status on this tournament -->
                            <p><AppMySubscriptionStatus :tournament full /></p>

                            <p v-if="tournament.accountRequired && (loggedInPlayer?.isGuest ?? true)">
                                <BIconExclamationTriangleFill class="text-warning me-1" />
                                <small>{{ $t('tournament_requires_account') }}</small>
                            </p>

                            <template v-if="isCheckInOpen(tournament)">
                                <!-- players who checked in -->
                                <h6>{{ $t('tournament_checkedin') }}</h6>

                                <ul
                                    v-if="tournament.subscriptions.some(subscription => subscription.checkedIn)"
                                    class="list-inline card-text"
                                >
                                    <li
                                        v-for="subscription in tournament.subscriptions.filter(subscription => subscription.checkedIn)"
                                        :key="subscription.player.publicId"
                                        class="list-inline-item me-4"
                                    >
                                        <AppPseudo :player="subscription.player" onlineStatus rating />
                                    </li>
                                </ul>

                                <p v-else class="card-text text-secondary"><small>{{ $t('no_player_checked_in_yet') }}</small></p>

                                <!-- players who subscribed but not yet checked in -->
                                <div v-if="tournament.subscriptions.some(subscription => !subscription.checkedIn)" class="text-warning">
                                    <h6>{{ $t('not_yet_checked_in') }}</h6>

                                    <ul class="list-inline card-text">
                                        <li
                                            v-for="subscription in tournament.subscriptions.filter(subscription => !subscription.checkedIn)"
                                            :key="subscription.player.publicId"
                                            class="list-inline-item me-4"
                                        >
                                            <AppPseudo :player="subscription.player" onlineStatus rating />
                                        </li>
                                    </ul>
                                </div>

                                <p v-else-if="tournament.subscriptions.some(subscription => subscription.checkedIn)" class="card-text text-secondary"><small>{{ $t('every_subscribers_checked_in') }}</small></p>
                            </template>

                            <template v-else>
                                <ul class="list-inline mt-3 card-text">
                                    <li
                                        v-for="subscription in tournament.subscriptions"
                                        :key="subscription.player.publicId"
                                        class="list-inline-item me-4"
                                    >
                                        <AppPseudo :player="subscription.player" onlineStatus rating />
                                    </li>
                                </ul>

                                <p v-if="0 === tournament.subscriptions.length" class="card-text"><i>{{ $t('no_subscriptions_yet') }}</i></p>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="container my-3">
            <template v-if="tournament.description">
                <h2>{{ $t('tournament_description') }}</h2>
                <p class="tournament-description">{{ tournament.description }}</p>
            </template>

            <AppTournamentHistorySection :tournament />
        </div>
    </template>
</template>

<style lang="stylus" scoped>
.tournament-description
    white-space pre-line
</style>
