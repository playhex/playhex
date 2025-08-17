<script setup lang="ts">
import { IconPeopleFill, IconPlus, IconRecordFill, IconTrophyFill } from '../../icons.js';
import { ref } from 'vue';
import { Tournament } from '../../../../shared/app/models';
import { apiGetActiveTournaments, apiGetEndedTournaments } from '../../../apiClient';
import { formatDistanceToNowStrict, intlFormat } from 'date-fns';
import { autoLocale } from '../../../../shared/app/i18n';
import AppTournamentFormat from '../components/AppTournamentFormat.vue';
import AppCountdown from '../../components/AppCountdown.vue';
import AppMySubscriptionStatus from '../components/AppMySubscriptionStatus.vue';
import { getActiveTournamentMatches } from '../../../../shared/app/tournamentUtils';
import { getCurrentTournamentSubscriptionStatus, iAmParticipant } from '../composables/tournamentCurrentSubscription';

const activeTournaments = ref<null | Tournament[]>(null);
const endedTournaments = ref<null | Tournament[]>(null);

(async () => {
    activeTournaments.value = await apiGetActiveTournaments();
    endedTournaments.value = await apiGetEndedTournaments();
})();

const isUpcoming = (tournament: Tournament): boolean => tournament.state === 'created';
const isActive = (tournament: Tournament): boolean => tournament.state === 'running';

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
</script>

<template>
    <div class="container my-3">
        <div class="d-flex justify-content-between">
            <div class="d-flex align-items-start">
                <h1>{{ $t('tournaments') }}</h1>
                <span class="badge text-bg-danger rounded-pill">beta</span>
            </div>

            <div>
                <router-link :to="{ name: 'tournaments-create' }" class="btn btn-sm btn-outline-success float-end">
                    <IconPlus />
                    {{ $t('create_tournament') }}
                </router-link>
            </div>
        </div>

        <div class="alert alert-warning" role="alert">
            <p class="m-0">
                Tournaments is a new feature, so you might encounter some bugs or unclear elements.
                Feel free to <a href="https://feedback.alcalyn.app/" target="_blank">share your feedback here</a>,
                or on the <a href="https://discord.gg/59SJ9KwvVq" target="_blank">Hex Discord</a> in the #playhex-org channel.
            </p>
        </div>

        <template v-if="null !== activeTournaments">

            <!--
                Playing tournaments
            -->
            <h2>{{ $t('playing_tournaments') }}</h2>

            <div class="row">
                <div
                    v-for="tournament in activeTournaments.filter(isActive)"
                    :key="tournament.publicId"
                    class="col-12 col-md-6 col-lg-4 mb-3"
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

            <!--
                Upcoming tournaments
            -->
            <h2>{{ $t('upcoming_tournaments') }}</h2>

            <div class="list-group mb-3 text-body">
                <router-link
                    v-for="tournament in activeTournaments.filter(isUpcoming)"
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

            <!--
                Past tournaments
            -->
            <h2>{{ $t('past_tournaments') }}</h2>

            <div class="row">
                <div
                    v-for="tournament in endedTournaments"
                    :key="tournament.publicId"
                    class="col-6 col-sm-4 col-md-3 col-xl-2 mb-4"
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
                                <small>{{ $t('n_participants', { count: tournament.participants.length }) }}</small>
                            </p>

                            <IconTrophyFill class="text-warning bg-icon" />
                            <p class="m-0"><small>{{ $t('tournament_ordinal.1') }}</small></p>
                            <p class="lead">{{ tournament.participants.find(p => 1 === p.rank)?.player.pseudo }}</p>

                            <p v-if="tournament.endedAt" class="card-text">
                                <small class="text-body-secondary">{{ formatEndedAtDate(tournament.endedAt) }}</small>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <p v-else>{{ $t('loading_tournaments') }}</p>
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
