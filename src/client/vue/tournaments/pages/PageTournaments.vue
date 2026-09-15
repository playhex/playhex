<script setup lang="ts">
import DOMPurify from 'dompurify';
import { IconPeopleFill, IconPlus, IconRecordFill, IconTrophyFill } from '../../icons.js';
import { computed, ref } from 'vue';
import { useHead } from '@unhead/vue';
import { Tournament } from '../../../../shared/app/models/index.js';
import { TournamentListItemDto } from '../../../../shared/app/models/TournamentListItemDto.js';
import { TournamentSeriesListItemDto } from '../../../../shared/app/models/TournamentSeriesDto.js';
import { apiGetActiveTournaments, apiGetEndedTournaments, apiGetTournamentSeriesList } from '../../../apiClient.js';
import { formatDistanceToNowStrict, intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import AppTournamentFormat from '../components/AppTournamentFormat.vue';
import AppCountdown from '../../components/AppCountdown.vue';
import AppMySubscriptionStatus from '../components/AppMySubscriptionStatus.vue';
import { getActiveTournamentMatches } from '../../../../shared/app/tournamentUtils.js';
import { getCurrentTournamentSubscriptionStatus, iAmParticipant } from '../composables/tournamentCurrentSubscription.js';
import { t } from 'i18next';
import useToastsStore from '../../../stores/toastsStore.js';
import AppTournamentSeriesCard from '../components/AppTournamentSeriesCard.vue';
import AppBreadcrumb from '../../components/AppBreadcrumb.vue';
import { tournamentsBreadcrumb } from '../composables/tournamentBreadcrumb.js';
import { by } from '../../../../shared/app/utils.js';

useHead({
    title: t('tournaments'),
});

const activeTournaments = ref<null | Tournament[]>(null);
const endedTournaments = ref<null | TournamentListItemDto[]>(null);
const allSeries = ref<null | TournamentSeriesListItemDto[]>(null);
const seriesLoadError = ref(false);

void (async () => {
    try {
        allSeries.value = await apiGetTournamentSeriesList();
    } catch (e) {
        seriesLoadError.value = true;
        useToastsStore().addToast(t('tournament_series_list_page.load_error'), { level: 'danger' });
    }
})();

void (async () => {
    try {
        activeTournaments.value = await apiGetActiveTournaments();
    } catch (e) {
        useToastsStore().addToast(
            'Could not load active tournaments',
            {
                level: 'danger',
            },
        );
    }

    try {
        endedTournaments.value = await apiGetEndedTournaments();
    } catch (e) {
        useToastsStore().addToast(
            'Could not load ended tournaments',
            {
                level: 'danger',
            },
        );
    }
})();

/**
 * Series with the most tournaments first.
 */
const sortedSeries = computed<null | TournamentSeriesListItemDto[]>(() => allSeries.value === null
    ? null
    : [...allSeries.value].sort(by(tournamentSeries => tournamentSeries.tournamentsCount, 'desc')),
);

const isUpcoming = (tournament: Tournament): boolean => tournament.state === 'created';
const isActive = (tournament: Tournament): boolean => tournament.state === 'running';

/**
 * Upcoming tournaments, soonest first.
 */
const upcomingTournaments = computed<Tournament[]>(() => (activeTournaments.value ?? [])
    .filter(isUpcoming)
    .sort(by(tournament => new Date(tournament.startOfficialAt).getTime())),
);

const formatEndedAtDate = (date: Date): string => {
    return intlFormat(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }, {
        locale: autoLocale(),
    });
};

// getCurrentTournamentSubscriptionStatus(activeTournaments.value![0]);

const mySubscriptionStatusClasses = (tournament: Tournament): string => {
    switch (getCurrentTournamentSubscriptionStatus(tournament)) {
        case 'subscribed': return 'list-group-item-border-left list-group-item-border-left-info';
        case 'must_check_in': return 'list-group-item-border-left list-group-item-border-left-warning';
        case 'checked_in': return 'list-group-item-border-left list-group-item-border-left-success';
        default: return '';
    }
};

const sanitizedT = (key: string, allowedTags: string[] = ['br', 'strong']): string => {
    return DOMPurify.sanitize(
        t(key),
        { ALLOWED_TAGS: allowedTags },
    );
};
</script>

<template>
    <div class="container my-3">
        <AppBreadcrumb :items="tournamentsBreadcrumb()" />

        <div class="row">
            <div class="col-12 col-lg-8">

                <div class="d-flex justify-content-between">
                    <div class="d-flex align-items-start">
                        <h1>{{ $t('tournaments') }}</h1>
                    </div>

                    <div>
                        <router-link :to="{ name: 'tournaments-create' }" class="btn btn-sm btn-outline-success float-end">
                            <IconPlus />
                            {{ $t('create_tournament') }}
                        </router-link>
                    </div>
                </div>

                <p v-html="sanitizedT('tournaments_page_intro')"></p>

                <template v-if="null !== activeTournaments">

                    <!--
                        Playing tournaments
                    -->
                    <h2>{{ $t('playing_tournaments') }}</h2>

                    <div v-if="activeTournaments.some(isActive)" class="row">
                        <div
                            v-for="tournament in activeTournaments.filter(isActive)"
                            :key="tournament.publicId"
                            class="col-12 col-md-6 mb-3"
                        >
                            <div class="card h-100">
                                <div class="card-body">
                                    <h3 class="card-title">{{ tournament.title }}</h3>
                                    <p class="card-text">
                                        <IconPeopleFill />
                                        {{ $t('n_participants', { count: tournament.participants.length }) }}
                                    </p>
                                    <p class="card-text lead">
                                        <IconRecordFill class="text-danger" />
                                        {{ $t('n_playing_games', { count: getActiveTournamentMatches(tournament).length }) }}
                                    </p>
                                    <p class="card-text">
                                        <router-link
                                            v-if="iAmParticipant(tournament)"
                                            :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                                            class="stretched-link btn btn-success"
                                        >
                                            {{ $t('view_tournament_as_participant') }}
                                        </router-link>
                                        <router-link
                                            v-else
                                            :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                                            class="stretched-link"
                                        >
                                            {{ $t('view_tournament') }}
                                        </router-link>
                                    </p>
                                </div>
                                <div class="card-footer">
                                    <p v-if="tournament.startedAt" class="card-text text-secondary"><small>
                                        {{ $t('tournament_started_ago', { date: formatDistanceToNowStrict(tournament.startedAt, { addSuffix: true }) }) }}
                                    </small></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p v-else><i>{{ $t('no_active_tournament') }}</i></p>

                    <!--
                        Upcoming tournaments
                    -->
                    <h2>{{ $t('upcoming_tournaments') }}</h2>

                    <div v-if="upcomingTournaments.length > 0" class="list-group mb-3 text-body">
                        <router-link
                            v-for="tournament in upcomingTournaments"
                            :key="tournament.publicId"
                            :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                            class="list-group-item"
                            :class="mySubscriptionStatusClasses(tournament)"
                        >
                            <div class="d-flex w-100 justify-content-between">
                                <h5 class="mb-0">{{ tournament.title }}</h5>
                                {{ $t('n_people_are_interested', { count: tournament.subscriptions.length }) }}
                            </div>
                            <p class="mb-0">
                                <small><AppCountdown :date="tournament.startOfficialAt" /></small>
                                <span>&nbsp;</span>
                                <AppMySubscriptionStatus :tournament />
                            </p>
                            <AppTournamentFormat :tournament class="mb-0" />
                        </router-link>
                    </div>

                    <p v-else><i>{{ $t('no_upcoming_tournament') }}</i></p>

                    <!--
                        Past tournaments
                    -->
                    <h2>{{ $t('past_tournaments') }}</h2>

                    <div v-if="endedTournaments" class="row">
                        <div
                            v-for="tournament in endedTournaments"
                            :key="tournament.publicId"
                            class="col-6 col-sm-4 col-xl-3 mb-4"
                        >
                            <div class="card h-100 text-center card-ended-tournament">
                                <div class="card-body">
                                    <h5 class="card-title mb-0">
                                        <router-link
                                            :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                                            class="text-body link stretched-link"
                                        >{{ tournament.title }}</router-link>
                                    </h5>
                                    <p class="card-text text-body-secondary nb-participants">
                                        <small>{{ $t('n_participants', { count: tournament.participantsCount }) }}</small>
                                    </p>

                                    <IconTrophyFill class="text-warning bg-icon" />
                                    <p class="m-0"><small>{{ $t('tournament_ordinal.1') }}</small></p>
                                    <p class="lead">{{ tournament.rank1Participant?.pseudo }}</p>

                                    <p v-if="tournament.endedAt" class="card-text">
                                        <small class="text-body-secondary">{{ formatEndedAtDate(tournament.endedAt) }}</small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p v-else-if="endedTournaments === null"><i>{{ $t('loading_tournaments') }}</i></p>
                    <p v-else><i>No tournament has been played yet.</i></p>
                </template>

                <p v-else>{{ $t('loading_tournaments') }}</p>

            </div>

            <!--
                Tournament series
            -->
            <aside class="col-12 col-lg-4">
                <div class="d-flex justify-content-between align-items-center">
                    <h2 class="h4">{{ $t('tournament_series_list_page.title') }}</h2>

                    <router-link :to="{ name: 'tournament-series' }"><small>{{ $t('tournament_series_list_page.see_all') }}</small></router-link>
                </div>

                <p><small>{{ $t('tournament_series_list_page.intro') }}</small></p>

                <p v-if="seriesLoadError" class="text-danger"><small>{{ $t('tournament_series_list_page.load_error') }}</small></p>

                <p v-else-if="null === sortedSeries"><i>{{ $t('tournament_series_list_page.loading') }}</i></p>

                <p v-else-if="0 === sortedSeries.length"><i>{{ $t('tournament_series_list_page.empty') }}</i></p>

                <template v-else>
                    <div
                        v-for="tournamentSeries in sortedSeries"
                        :key="tournamentSeries.publicId"
                        class="mb-3"
                    >
                        <AppTournamentSeriesCard :tournamentSeries :headingLevel="3" />
                    </div>
                </template>
            </aside>
        </div>
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

.list-group-item-border-left
    padding-left calc(var(--bs-list-group-item-padding-x) - 0.25rem + var(--bs-list-group-border-width))
    border-left 0.25rem solid

    &.list-group-item-border-left-info
        border-left-color var(--bs-info)

    &.list-group-item-border-left-warning
        border-left-color var(--bs-warning)

    &.list-group-item-border-left-success
        border-left-color var(--bs-success)
</style>
