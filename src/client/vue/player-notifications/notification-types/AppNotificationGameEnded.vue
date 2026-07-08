<script setup lang="ts">
import { formatDistanceToNowStrict } from 'date-fns';
import { PlayerNotification } from '../../../../shared/app/models/index.js';
import { IconPartyPopper } from '../../icons.js';

defineProps({
    playerNotification: {
        type: PlayerNotification<'gameEnded'>,
        required: true,
    },
});
</script>

<template>
    <p>
        <span v-if="playerNotification.parameters.iWon" class="text-success">
            <IconPartyPopper />
            {{ $t('notification.you_won') }}
        </span>

        <span v-else class="text-danger">
            {{ $t('notification.you_lost') }}
        </span>

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
