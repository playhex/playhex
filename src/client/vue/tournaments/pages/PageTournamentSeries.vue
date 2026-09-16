<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { Tournament } from '../../../../shared/app/models/index.js';
import { TournamentListItemDto } from '../../../../shared/app/models/TournamentListItemDto.js';
import { isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';
import { by } from '../../../../shared/app/utils.js';
import { apiGetTournament } from '../../../apiClient.js';
import { IconBell, IconCalendarEvent, IconPencilSquare, IconPeopleFill, IconPlus, IconRecordFill, IconTrophyFill } from '../../icons.js';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import AppCountdown from '../../components/AppCountdown.vue';
import AppMySubscriptionStatus from '../components/AppMySubscriptionStatus.vue';
import AppTournamentPodium from '../components/AppTournamentPodium.vue';
import AppTournamentStartsAt from '../components/AppTournamentStartsAt.vue';
import { tournamentSeriesBreadcrumb } from '../composables/tournamentBreadcrumb.js';
import { useTournamentCurrentSubscription } from '../composables/tournamentCurrentSubscription.js';
import { useTournamentSeriesFromUrl } from '../composables/tournamentSeriesFromUrl.js';
import { useEnableNotificationsAfterTournamentSubscribe } from '../../composables/enableNotificationsAfterTournamentSubscribe.js';

const {
    tournamentSeries,
    iAmHost,
} = useTournamentSeriesFromUrl();

useHead({
    title: () => (tournamentSeries.value === false ? null : tournamentSeries.value?.title) ?? t('tournament_series'),
});

/**
 * Tournaments currently playing. Shown apart from upcoming ones, to put them forward.
 */
const runningTournaments = computed<TournamentListItemDto[]>(() => {
    if (!tournamentSeries.value) {
        return [];
    }

    return tournamentSeries.value.tournaments
        .filter(tournament => tournament.state === 'running')
    ;
});

/**
 * Upcoming tournaments, soonest first.
 */
const upcomingTournaments = computed<TournamentListItemDto[]>(() => {
    if (!tournamentSeries.value) {
        return [];
    }

    return tournamentSeries.value.tournaments
        .filter(tournament => tournament.state === 'created')
        .sort(by(tournament => new Date(tournament.startOfficialAt).getTime()))
    ;
});

const pastTournaments = computed<TournamentListItemDto[]>(() => {
    if (!tournamentSeries.value) {
        return [];
    }

    return tournamentSeries.value.tournaments
        .filter(tournament => tournament.state === 'ended')
    ;
});

/**
 * Tournament the last podium comes from.
 */
const lastEndedTournament = computed<null | TournamentListItemDto>(() => pastTournaments.value[0] ?? null);

/**
 * Upcoming tournament starting the soonest.
 */
const nextTournament = computed<null | TournamentListItemDto>(() => upcomingTournaments.value[0] ?? null);

/**
 * Full next tournament, loaded apart to allow subscribing/checking in from this page.
 */
const nextTournamentFull = ref<null | Tournament>(null);

watch(() => nextTournament.value?.slug ?? null, async slug => {
    if (slug === null) {
        nextTournamentFull.value = null;
        return;
    }

    nextTournamentFull.value = await apiGetTournament(slug);
}, { immediate: true });

const {
    currentTournamentSubscription,
    subscribeCheckIn,
} = useTournamentCurrentSubscription(nextTournamentFull);

const { promptIfNeeded } = useEnableNotificationsAfterTournamentSubscribe('tournament_checkin_opens');

const subscribeAndPrompt = async () => {
    void subscribeCheckIn();
    await promptIfNeeded();
};

const createNextInstanceRoute = computed(() => {
    if (!tournamentSeries.value) {
        return { name: 'tournaments-create' };
    }

    const query: { series: string, clone?: string } = { series: tournamentSeries.value.slug };

    if (tournamentSeries.value.lastTournamentSlug) {
        query.clone = tournamentSeries.value.lastTournamentSlug;
    }

    return { name: 'tournaments-create', query };
});

const autoCreatePanelRoute = computed(() => ({
    name: 'tournament-series-edit',
    params: { slug: tournamentSeries.value ? tournamentSeries.value.slug : '' },
    query: { panel: 'auto-create' },
}));

const formatDate = (date: Date): string => intlFormat(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
}, {
    locale: autoLocale(),
});

/**
 * Start date of an upcoming tournament, with the day of week,
 * useful to know when a recurring tournament is played.
 */
const formatStartDate = (date: Date): string => intlFormat(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
}, {
    locale: autoLocale(),
});
</script>

<template>
    <div class="container my-3">
        <template v-if="tournamentSeries">
            <AppBreadcrumb :items="tournamentSeriesBreadcrumb(tournamentSeries.title)" />

            <router-link
                v-if="iAmHost()"
                :to="{ name: 'tournament-series-edit', params: { slug: tournamentSeries.slug } }"
                class="btn btn-sm btn-outline-warning float-end ms-2"
            >
                <IconPencilSquare /> {{ $t('tournament_series_page.edit') }}
            </router-link>

            <router-link
                v-if="iAmHost()"
                :to="createNextInstanceRoute"
                class="btn btn-sm btn-outline-success float-end ms-2"
            >
                <IconPlus /> {{ $t('tournament_series_page.create_next_instance') }}
            </router-link>

            <h1 class="m-0">{{ tournamentSeries.title }}</h1>

            <p class="text-body-secondary"><small>
                {{ $t('tournament_series_page.host', { player: tournamentSeries.host.pseudo }) }}
                <template v-if="tournamentSeries.admins.length > 0">
                    <br>
                    {{ $t('tournament_series_page.admins', { count: tournamentSeries.admins.length, players: tournamentSeries.admins.map(admin => admin.pseudo).join(', ') }) }}
                </template>
            </small></p>

            <p v-if="tournamentSeries.description" class="text-break">{{ tournamentSeries.description }}</p>

            <!-- Playing now -->
            <template v-if="runningTournaments.length > 0">
                <h2>{{ $t('playing_tournaments') }}</h2>

                <div
                    v-for="tournament in runningTournaments"
                    :key="tournament.publicId"
                    class="card border-danger mb-3"
                >
                    <div class="card-body">
                        <h3 class="card-title h4">
                            <IconRecordFill class="text-danger" />
                            <router-link
                                :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                                class="text-body stretched-link"
                            >{{ tournament.title }}</router-link>
                        </h3>
                        <p class="card-text mb-0">{{ $t('n_participants', { count: tournament.participantsCount }) }}</p>
                    </div>
                </div>
            </template>

            <div class="row">

                <!-- Next tournament -->
                <div class="col-12 col-lg-6">
                    <p class="eyebrow text-body-secondary">{{ $t('tournament_series_page.next_tournament') }}</p>

                    <!-- no tournament planned yet, or still loading it -->
                    <div v-if="!nextTournamentFull" class="card mb-3 card-next-tournament">
                        <div class="card-body d-flex flex-column justify-content-center align-items-center text-center">
                            <p class="card-text lead text-body-secondary" :class="iAmHost() ? 'mb-3' : 'mb-0'">
                                <template v-if="nextTournament">{{ $t('loading_tournament') }}</template>
                                <template v-else>{{ $t('tournament_series_page.no_next_tournament') }}</template>
                            </p>

                            <router-link
                                v-if="!nextTournament && iAmHost()"
                                :to="createNextInstanceRoute"
                                class="btn btn-outline-success"
                            >
                                <IconPlus /> {{ $t('tournament_series_page.create_next_instance') }}
                            </router-link>

                            <router-link
                                v-if="!nextTournament && iAmHost() && !tournamentSeries.autoCreate"
                                :to="autoCreatePanelRoute"
                                class="btn btn-sm btn-outline-secondary mt-2"
                            >
                                <IconCalendarEvent /> {{ $t('tournament_series_page.configure_auto_create') }}
                            </router-link>
                        </div>
                    </div>

                    <div v-else class="card border-info mb-3 card-next-tournament">
                        <div class="card-body">
                            <h2 class="card-title h4 mt-0">
                                <router-link
                                    :to="{ name: 'tournament', params: { slug: nextTournamentFull.slug } }"
                                    class="text-body"
                                >{{ nextTournamentFull.title }}</router-link>
                            </h2>

                            <p class="card-text">
                                <IconCalendarEvent class="me-1" />
                                <AppTournamentStartsAt :tournament="nextTournamentFull" />
                                <br>
                                <small class="text-body-secondary"><AppCountdown :date="nextTournamentFull.startOfficialAt" /></small>
                            </p>

                            <p class="card-text">
                                <IconPeopleFill class="me-1" />
                                <template v-if="!isCheckInOpen(nextTournamentFull)">
                                    {{ $t('n_people_are_interested', { count: nextTournamentFull.subscriptions.length }) }}
                                </template>
                                <template v-else>
                                    {{ $t('n_participants', { count: nextTournamentFull.subscriptions.filter(subscription => subscription.checkedIn).length }) }}
                                </template>
                            </p>

                            <!-- subscribe / check-in -->
                            <p class="card-text mb-1">
                                <button
                                    v-if="!isCheckInOpen(nextTournamentFull) && null === currentTournamentSubscription"
                                    @click="subscribeAndPrompt"
                                    class="btn btn-outline-info"
                                ><IconBell /> {{ $t('tournament_subscribe') }}</button>

                                <button
                                    v-if="isCheckInOpen(nextTournamentFull) && (null === currentTournamentSubscription || !currentTournamentSubscription.checkedIn)"
                                    @click="subscribeAndPrompt"
                                    class="btn btn-success"
                                >{{ $t('tournament_checkin') }}</button>
                            </p>

                            <p class="card-text"><AppMySubscriptionStatus :tournament="nextTournamentFull" full /></p>
                        </div>
                    </div>

                    <!-- Auto create, only shown to host and admins who can change it -->
                    <p v-if="iAmHost() && tournamentSeries.autoCreate" class="text-body-secondary"><small>
                        <IconCalendarEvent class="me-1" />
                        {{ $t('tournament_series_page.auto_create_enabled') }}
                        <router-link :to="autoCreatePanelRoute">{{ $t('tournament_series_page.auto_create_manage') }}</router-link>
                    </small></p>
                </div>

                <!-- Last ended tournament and its podium -->
                <div v-if="lastEndedTournament && tournamentSeries.lastPodium.length > 0" class="col-12 col-lg-6">
                    <p class="eyebrow text-body-secondary">{{ $t('tournament_series_page.last_tournament') }}</p>

                    <h2 class="h4 mt-0">
                        <router-link
                            :to="{ name: 'tournament', params: { slug: lastEndedTournament.slug } }"
                            class="text-body"
                        >{{ lastEndedTournament.title }}</router-link>
                    </h2>

                    <p v-if="lastEndedTournament.endedAt" class="text-body-secondary">
                        <small>{{ formatDate(new Date(lastEndedTournament.endedAt)) }}</small>
                    </p>

                    <AppTournamentPodium :players="tournamentSeries.lastPodium" small />
                </div>
            </div>

            <!-- Upcoming / playing -->
            <h2>{{ $t('upcoming_tournaments') }}</h2>

            <div v-if="upcomingTournaments.length > 0" class="list-group mb-3 text-body">
                <router-link
                    v-for="tournament in upcomingTournaments"
                    :key="tournament.publicId"
                    :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                    class="list-group-item"
                >
                    <div class="d-flex w-100 justify-content-between">
                        <h3 class="h5 mb-0">{{ tournament.title }}</h3>
                        <span>{{ $t('n_participants', { count: tournament.participantsCount }) }}</span>
                    </div>
                    <small>{{ formatStartDate(new Date(tournament.startOfficialAt)) }}</small>
                </router-link>
            </div>

            <p v-else><i>{{ $t('no_upcoming_tournament') }}</i></p>

            <!-- Past tournaments -->
            <h2>{{ $t('past_tournaments') }}</h2>

            <div v-if="pastTournaments.length > 0" class="row">
                <div
                    v-for="tournament in pastTournaments"
                    :key="tournament.publicId"
                    class="col-6 col-sm-4 col-md-3 col-xl-2 mb-4"
                >
                    <div class="card h-100 text-center card-ended-tournament">
                        <div class="card-body">
                            <h3 class="card-title h5 mb-0">
                                <router-link
                                    :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                                    class="text-body link stretched-link"
                                >{{ tournament.title }}</router-link>
                            </h3>
                            <p class="card-text text-body-secondary">
                                <small>{{ $t('n_participants', { count: tournament.participantsCount }) }}</small>
                            </p>

                            <IconTrophyFill class="text-warning bg-icon" />
                            <p class="m-0"><small>{{ $t('tournament_ordinal.1') }}</small></p>
                            <p class="lead">{{ tournament.rank1Participant?.pseudo }}</p>

                            <p v-if="tournament.endedAt" class="card-text">
                                <small class="text-body-secondary">{{ formatDate(new Date(tournament.endedAt)) }}</small>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <p v-else><i>{{ $t('tournament_series_page.no_tournament_yet') }}</i></p>
        </template>

        <p v-else-if="null === tournamentSeries">{{ $t('tournament_series_list_page.loading') }}</p>
        <p v-else>{{ $t('tournament_series_page.not_found') }}</p>
    </div>
</template>

<style lang="stylus" scoped>
h2
    margin-top 1.5em

.eyebrow
    margin-top 1.5em
    margin-bottom 0
    font-size .8rem
    text-transform uppercase
    letter-spacing .08em

.card-next-tournament
    min-height 14rem

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
