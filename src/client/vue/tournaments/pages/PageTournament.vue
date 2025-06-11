<script setup lang="ts">
import { format } from 'date-fns';
import { storeToRefs } from 'pinia';
import { apiDeleteTournamentSubscription, apiPutTournamentSubscription } from '../../../apiClient';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { byRank, getCheckInOpensDate, isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppTimeControlLabel from '../../components/AppTimeControlLabel.vue';
import { useTournamentFromUrl } from '../../composables/useTournamentFromUrl.js';
import useAuthStore from '../../../stores/authStore';
import { Player, TournamentSubscription } from '../../../../shared/app/models';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError';
import { Toast } from '../../../../shared/app/Toast';
import useToastsStore from '../../../stores/toastsStore';
import i18next from 'i18next';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const {
    tournament,
    slug,
    iAmHost,
} = useTournamentFromUrl();

useHead({
    title: () => tournament.value ? tournament.value.title : 'Tournament',
});

const { loggedInPlayer } = storeToRefs(useAuthStore());

const isMe = (player: Player): boolean => null !== loggedInPlayer.value && loggedInPlayer.value.publicId === player.publicId;

const currentTournamentSubscription = computed<null | TournamentSubscription>(() => {
    if (!tournament.value) {
        return null;
    }

    for (const subscription of tournament.value.subscriptions) {
        if (isMe(subscription.player)) {
            return subscription;
        }
    }

    return null;
});

const router = useRouter();

const goToLoginPage = (): void => {
    router.push({
        name: 'login',
    });
};

const subscribeCheckIn = async () => {
    if (!tournament.value) {
        return;
    }

    try {
        const tournamentSubscription = await apiPutTournamentSubscription(tournament.value.slug);

        const displayedSubscription = tournament.value.subscriptions
            .find(subcription => subcription.player.publicId === tournamentSubscription.player.publicId)
        ;

        if (!displayedSubscription) {
            tournament.value.subscriptions.push(tournamentSubscription);
        } else {
            displayedSubscription.checkedIn = tournamentSubscription.checkedIn;
        }
    } catch (e) {
        if (e instanceof DomainHttpError) {
            if ('tournament_player_is_banned' === e.type) {
                useToastsStore().addToast(new Toast(
                    i18next.t(e.type),
                    {
                        level: 'danger',
                    },
                ));

                return;
            }

            if ('tournament_account_required' === e.type) {
                useToastsStore().addToast(new Toast(
                    i18next.t(e.type),
                    {
                        level: 'danger',
                        actions: [
                            {
                                label: i18next.t('log_in'),
                                action: () => goToLoginPage(),
                            },
                        ],
                    },
                ));

                return;
            }
        }

        throw e;
    }
};

const unsub = async () => {
    if (!currentTournamentSubscription.value) {
        return;
    }

    await apiDeleteTournamentSubscription(slug, currentTournamentSubscription.value.publicId);

    if (!tournament.value) {
        return;
    }

    tournament.value.subscriptions = tournament.value.subscriptions
        .filter(subscription => !isMe(subscription.player))
    ;
};
</script>

<template>
    <div class="container-fluid my-3">
        <template v-if="tournament">
            <router-link
                v-if="iAmHost()"
                :to="{ name: 'tournament-manage', params: { slug }}"
                class="btn btn-outline-warning float-end"
            >
                Manage
            </router-link>

            <h1>{{ tournament.title }}</h1>

            <p>Hosted by <AppPseudo :player="tournament.host" /></p>

            <p>Format: <AppTimeControlLabel :timeControlBoardsize="tournament" /> {{ tournament.stage1Format }}</p>

            <template v-if="'created' === tournament.state">
                <p>Starts at {{ format(tournament.startsAt, 'd MMMM yyyy p') }}</p>
                <p>Check-in opens at {{ format(getCheckInOpensDate(tournament), 'd MMMM yyyy p') }}</p>
            </template>
            <p v-else-if="'running' === tournament.state" class="text-success">Now playing</p>
            <p v-else>Ended at {{ tournament.endedAt ? format(tournament.endedAt, 'd MMMM yyyy p') : '-' }}</p>

            <template v-if="'created' === tournament.state">
                <h2>Subscriptions</h2>

                <ul>
                    <li
                        v-for="subscription in tournament.subscriptions"
                        :key="subscription.player.publicId"
                    >
                        {{ subscription.player.pseudo }}
                        <span v-if="subscription.checkedIn">(checked-in)</span>
                    </li>
                </ul>

                <!-- subscribe / ckeck-in / unsubscribe -->
                <button
                    v-if="!isCheckInOpen(tournament) && null === currentTournamentSubscription"
                    @click="subscribeCheckIn"
                    class="btn btn-primary"
                >Subscribe</button>

                <button
                    v-if="isCheckInOpen(tournament) && (null === currentTournamentSubscription || !currentTournamentSubscription.checkedIn)"
                    @click="subscribeCheckIn"
                    class="btn btn-success"
                >Check-in</button>

                <button
                    v-if="null !== currentTournamentSubscription"
                    @click="unsub()"
                    class="btn btn-danger"
                >Unsubscribe</button>
            </template>

            <AppTournamentBracket :tournament />

            <template v-if="'created' !== tournament.state">
                <h2>Participants</h2>

                <ul>
                    <li
                        v-for="participant in tournament.participants.sort(byRank)"
                        :key="participant.player.publicId"
                    >
                        {{ participant.rank ?? '-' }} - <strong>{{ participant.player.pseudo }}</strong>: {{ participant.score }} points (tiebreak {{ participant.tiebreak }})
                    </li>
                </ul>
            </template>

            <h2>History</h2>

            <ul>
                <li v-for="history, key in tournament.history" :key>
                    {{ $t('tournament_history.' + history.type, history.parameters) }} - {{ history.date }}
                </li>
            </ul>
        </template>

        <template v-else-if="null === tournament">
            <p>Loading tournament</p>
        </template>

        <template v-else-if="false === tournament">
            <p>Tournament not found</p>
        </template>
    </div>
</template>
