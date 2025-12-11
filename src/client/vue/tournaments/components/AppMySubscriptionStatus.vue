<script setup lang="ts">
import { toRefs } from 'vue';
import { Tournament } from '../../../../shared/app/models/index.js';
import { useTournamentCurrentSubscription } from '../composables/tournamentCurrentSubscription.js';
import { isCheckInOpen } from '../../../../shared/app/tournamentUtils.js';
import { IconBellCheckFill, IconCheck, IconExclamationTriangleFill } from '../../icons.js';

/*
 * Shows a text like "You are subscribed" on a tournament,
 * for currently logged in player.
 */

const props = defineProps({
    /**
     * For which tournament we should show an info about currently logged in player subscription
     */
    tournament: {
        type: Tournament,
        required: true,
    },

    /**
     * By default, false, only display info if player is subscribed or checked-in.
     * Set true to also show a text when player has not yet subscribed to this tournament.
     */
    full: {
        type: Boolean,
        required: false,
        default: false,
    },
});

const { tournament } = toRefs(props);
const { currentTournamentSubscription, unsub } = useTournamentCurrentSubscription(tournament);
</script>

<template>
    <template v-if="currentTournamentSubscription">

        <!-- before check in period -->
        <template v-if="!isCheckInOpen(tournament)">
            <span class="text-info"><IconBellCheckFill /> {{ $t('tournament_subscription.subscribed') }}</span>
            <small v-if="full" class="ms-3"><a href="#" @click.prevent="unsub" class="link-secondary">{{ $t('tournament_unsubscribe') }}</a></small>
        </template>

        <!-- check in period open -->
        <template v-else>
            <template v-if="currentTournamentSubscription.checkedIn">
                <span class="text-success"><IconCheck /> {{ $t('tournament_subscription.checked_in') }}</span>
                <small v-if="full" class="ms-3"><a href="#" @click.prevent="unsub" class="link-secondary">{{ $t('tournament_unsubscribe') }}</a></small>
            </template>
            <span v-else class="text-warning"><IconExclamationTriangleFill /> {{ $t('tournament_subscription.must_check_in') }}</span>
        </template>

    </template>

    <!-- full: show info for players not yet subscribed -->
    <template v-else-if="full">

        <!-- before check in period -->
        <span v-if="!isCheckInOpen(tournament)">{{ $t('tournament_subscription.can_subscribe') }}</span>

        <!-- check in period open -->
        <span v-else>{{ $t('tournament_subscription.can_check_in') }}</span>

    </template>
</template>
