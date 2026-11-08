<script setup lang="ts">
import { playerGender } from '../../../../shared/app/playerPronouns.js';
import useAuthStore from '../../../stores/authStore.js';
import { computed } from 'vue';
import { t } from 'i18next';
import { formatDistanceToNowStrict } from 'date-fns';
import { PlayerNotification } from '../../../../shared/app/models/index.js';
import { IconCrown } from '../../icons.js';

const props = defineProps({
    playerNotification: {
        type: PlayerNotification,
        required: true,
    },
});

const text = computed((): string => {
    const { type, parameters } = props.playerNotification;

    const context = playerGender(useAuthStore().loggedInPlayer);

    switch (type) {
        case 'ladderChallenge': return t('ladder.notification.challenge', { ...(parameters as PlayerNotification<'ladderChallenge'>['parameters']), context });
        case 'ladderLiveProposal': return t('ladder.notification.live_proposal', { ...(parameters as PlayerNotification<'ladderLiveProposal'>['parameters']), context });
        case 'ladderStrike': {
            const { strikes, removed, beforeFirstGame } = parameters as PlayerNotification<'ladderStrike'>['parameters'];

            if (removed && beforeFirstGame) {
                return t('ladder.notification.strike_removed_before_first_game', { context });
            }

            return t(removed ? 'ladder.notification.strike_removed' : 'ladder.notification.strike', { strikes, context });
        }
        case 'ladderRemovedInactive': return t('ladder.notification.removed_inactive', { context });
        case 'ladderCheater': return t('ladder.notification.cheater', { ...(parameters as PlayerNotification<'ladderCheater'>['parameters']), context });
        case 'ladderExcluded': return t('ladder.notification.excluded', { context });
        case 'ladderCheatVictim': return t('ladder.notification.cheat_victim', { ...(parameters as PlayerNotification<'ladderCheatVictim'>['parameters']), context });
        default: return '';
    }
});
</script>

<template>
    <p>
        <!-- Already wrapped in a link to the game when notification has a game -->
        <span v-if="playerNotification.game" class="text-warning">
            <IconCrown />
            {{ text }}
        </span>
        <router-link v-else :to="{ name: 'ladder', params: { slug: 'main' } }" class="text-warning text-decoration-none">
            <IconCrown />
            {{ text }}
        </router-link>

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
