import { t } from 'i18next';
import { computed, Ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import Tournament from '../../../../shared/app/models/Tournament.js';
import TournamentSubscription from '../../../../shared/app/models/TournamentSubscription.js';
import useAuthStore from '../../../stores/authStore.js';
import Player from '../../../../shared/app/models/Player.js';
import { isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';
import { apiDeleteTournamentSubscription, apiPutTournamentSubscription } from '../../../apiClient.js';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError.js';
import { Toast } from '../../../../shared/app/Toast.js';
import useToastsStore from '../../../stores/toastsStore.js';

const { loggedInPlayer } = storeToRefs(useAuthStore());

const isMe = (player: Player): boolean => loggedInPlayer.value !== null && loggedInPlayer.value.publicId === player.publicId;

export const getCurrentTournamentSubscription = (tournament: Tournament): null | TournamentSubscription => {
    for (const subscription of tournament.subscriptions) {
        if (isMe(subscription.player)) {
            return subscription;
        }
    }

    return null;
};

export const getCurrentTournamentSubscriptionStatus = (tournament: Tournament): null | 'subscribed' | 'must_check_in' | 'checked_in' => {
    const currentTournamentSubscription = getCurrentTournamentSubscription(tournament);

    if (currentTournamentSubscription === null) {
        return null;
    }

    if (!isCheckInOpen(tournament)) {
        return 'subscribed';
    }

    if (currentTournamentSubscription.checkedIn) {
        return 'checked_in';
    }

    return 'must_check_in';
};

export const iAmParticipant = (tournament: Tournament): boolean => {
    return tournament.participants.some(participant => isMe(participant.player));
};

export const useTournamentCurrentSubscription = (tournament: Ref<null | false | Tournament>) => {
    const router = useRouter();

    const goToLoginPage = (): void => {
        router.push({
            name: 'login',
        });
    };

    const currentTournamentSubscription = computed<null | TournamentSubscription>(() => {
        if (!tournament.value) {
            return null;
        }

        return getCurrentTournamentSubscription(tournament.value);
    });

    return {
        currentTournamentSubscription,

        async subscribeCheckIn()
        {
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
                    if (e.type === 'tournament_player_is_banned') {
                        useToastsStore().addToast(new Toast(
                            t(e.type),
                            {
                                level: 'danger',
                            },
                        ));

                        return;
                    }

                    if (e.type === 'tournament_account_required') {
                        useToastsStore().addToast(new Toast(
                            t(e.type),
                            {
                                level: 'danger',
                                actions: [
                                    {
                                        label: t('log_in'),
                                        action: () => goToLoginPage(),
                                    },
                                ],
                                autoCloseAfter: 8000,
                            },
                        ));

                        return;
                    }
                }

                throw e;
            }
        },

        async unsub()
        {
            if (!tournament.value) {
                return;
            }

            if (!currentTournamentSubscription.value) {
                return;
            }

            await apiDeleteTournamentSubscription(tournament.value.slug, currentTournamentSubscription.value.player.publicId);

            if (!tournament.value) {
                return;
            }

            tournament.value.subscriptions = tournament.value.subscriptions
                .filter(subscription => !isMe(subscription.player))
            ;
        },
    };
};
