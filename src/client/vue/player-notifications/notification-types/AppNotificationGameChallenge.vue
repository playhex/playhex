<script setup lang="ts">
import { PlayerNotification } from '../../../../shared/app/models/index.js';
import { formatDistanceToNowStrict } from 'date-fns';

defineProps({
    playerNotification: {
        type: PlayerNotification<'gameChallenge'>,
        required: true,
    },
});
</script>

<template>
    <p>
        <span class="text-success">
            {{ $t('player_challenged_you', { player: playerNotification.parameters.player }) }}
        </span>

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
