import { storeToRefs } from 'pinia';
import Tournament from '../../../../shared/app/models/Tournament.js';
import TournamentSubscription from '../../../../shared/app/models/TournamentSubscription.js';
import useAuthStore from '../../../stores/authStore.js';
import Player from '../../../../shared/app/models/Player.js';
import { computed, Ref } from 'vue';
import { isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';

const { loggedInPlayer } = storeToRefs(useAuthStore());

const isMe = (player: Player): boolean => null !== loggedInPlayer.value && loggedInPlayer.value.publicId === player.publicId;

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

    if (null === currentTournamentSubscription) {
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
    return {
        currentTournamentSubscription: computed<null | TournamentSubscription>(() => {
            if (!tournament.value) {
                return null;
            }

            return getCurrentTournamentSubscription(tournament.value);
        }),
    };
};
