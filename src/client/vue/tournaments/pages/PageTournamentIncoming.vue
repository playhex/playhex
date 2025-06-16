<script setup lang="ts">
import { format } from 'date-fns';
import { storeToRefs } from 'pinia';
import { apiDeleteTournamentSubscription, apiPutTournamentSubscription } from '../../../apiClient';
import AppTournamentBracket from '../components/AppTournamentBracket.vue';
import { useHead } from '@unhead/vue';
import { getCheckInOpensDate, isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppTimeControlLabel from '../../components/AppTimeControlLabel.vue';
import { useTournamentFromUrl } from '../composables/tournamentFromUrl.js';
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

    await apiDeleteTournamentSubscription(slug, currentTournamentSubscription.value.player.publicId);

    if (!tournament.value) {
        return;
    }

    tournament.value.subscriptions = tournament.value.subscriptions
        .filter(subscription => !isMe(subscription.player))
    ;
};
</script>

<template>
    <template v-if="tournament">
        <div class="container-fluid my-3">
            <router-link
                v-if="iAmHost()"
                :to="{ name: 'tournament-manage', params: { slug } }"
                class="btn btn-outline-warning float-end ms-2"
            >
                Manage
            </router-link>

            <router-link
                :to="{ name: 'tournaments-create', hash: '#clone-' + slug }"
                class="btn btn-outline-success float-end ms-2"
            >
                Clone
            </router-link>

            <h1>{{ tournament.title }}</h1>

            <p>Hosted by <AppPseudo :player="tournament.host" /></p>

            <p>Format: <AppTimeControlLabel :timeControlBoardsize="tournament" /> {{ tournament.stage1Format }}</p>

            <p>Starts at {{ format(tournament.startOfficialAt, 'd MMMM yyyy p') }}</p>
            <p>Check-in opens at {{ format(getCheckInOpensDate(tournament), 'd MMMM yyyy p') }}</p>

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
        </div>

        <AppTournamentBracket :tournament />

        <div class="container-fluid my-3">
            <template v-if="tournament.description">
                <h2>Description</h2>
                <p class="tournament-description">{{ tournament.description }}</p>
            </template>

            <h2>History</h2>

            <ul>
                <li v-for="history, key in tournament.history" :key>
                    {{ $t('tournament_history.' + history.type, history.parameters) }} - {{ history.date }}
                </li>
            </ul>
        </div>
    </template>
</template>

<style lang="stylus" scoped>
.tournament-description
    white-space pre-line
</style>
