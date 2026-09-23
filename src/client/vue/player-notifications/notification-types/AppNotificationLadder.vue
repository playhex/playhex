<script setup lang="ts">
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

    switch (type) {
        case 'ladderChallenge': return t('ladder.notification.challenge', parameters as PlayerNotification<'ladderChallenge'>['parameters']);
        case 'ladderLiveProposal': return t('ladder.notification.live_proposal', parameters as PlayerNotification<'ladderLiveProposal'>['parameters']);
        case 'ladderStrike': {
            const { strikes, removed } = parameters as PlayerNotification<'ladderStrike'>['parameters'];

            return t(removed ? 'ladder.notification.strike_removed' : 'ladder.notification.strike', { strikes });
        }
        case 'ladderRemovedInactive': return t('ladder.notification.removed_inactive');
        default: return '';
    }
});
</script>

<template>
    <p>
        <router-link to="/king-of-the-hill" class="text-warning text-decoration-none">
            <IconCrown />
            {{ text }}
        </router-link>

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
