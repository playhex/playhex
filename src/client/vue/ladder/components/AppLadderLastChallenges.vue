<script setup lang="ts">
import { PropType } from 'vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { LadderChallenge, Player } from '../../../../shared/app/models/index.js';
import AppPseudo from '../../components/AppPseudo.vue';
import { IconShieldFill, IconSword } from '../../icons.js';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
    challenges: {
        type: Array as PropType<LadderChallenge[]>,
        required: true,
    },
});

const isChallenger = (challenge: LadderChallenge): boolean => challenge.challenger.publicId === props.player.publicId;

const outcome = (challenge: LadderChallenge): 'won' | 'lost' | 'voided' => {
    if (challenge.result === 'voided' || challenge.result === null) {
        return 'voided';
    }

    return (challenge.result === 'challenger_won') === isChallenger(challenge) ? 'won' : 'lost';
};

const outcomeClass = {
    won: 'text-bg-success',
    lost: 'text-bg-danger',
    voided: 'text-bg-secondary',
};

/**
 * Seat change of player after this challenge, or null if did not move
 */
const seatChange = (challenge: LadderChallenge): null | { from: number, to: number } => {
    const from = isChallenger(challenge) ? challenge.challengerPositionBefore : challenge.defenderPositionBefore;
    const to = isChallenger(challenge) ? challenge.challengerPositionAfter : challenge.defenderPositionAfter;

    return from !== null && to !== null && from !== to ? { from, to } : null;
};
</script>

<template>
    <p v-if="challenges.length === 0" class="small text-secondary mb-0">{{ $t('ladder.no_last_games') }}</p>

    <ul v-else class="list-unstyled small mb-0">
        <li v-for="challenge in challenges" :key="challenge.publicId" class="d-flex align-items-center gap-1 mb-1">
            <span class="badge" :class="outcomeClass[outcome(challenge)]">{{ $t(`ladder.game_outcome.${outcome(challenge)}`) }}</span>
            <IconSword v-if="isChallenger(challenge)" class="text-secondary" />
            <IconShieldFill v-else class="text-secondary" />
            <span class="text-truncate">
                <AppPseudo :player="isChallenger(challenge) ? challenge.defender : challenge.challenger" />
                <span v-if="seatChange(challenge)" class="text-secondary ms-1">#{{ seatChange(challenge)!.from }} → #{{ seatChange(challenge)!.to }}</span>
            </span>
            <span class="text-secondary ms-auto text-nowrap">{{ formatDistanceToNowStrict(challenge.endedAt ?? challenge.createdAt, { addSuffix: true }) }}</span>
            <router-link
                v-if="challenge.game"
                :to="{ name: 'online-game', params: { gameId: challenge.game.publicId } }"
                class="btn btn-sm btn-outline-secondary py-0"
            >{{ $t('game.review') }}</router-link>
        </li>
    </ul>
</template>
