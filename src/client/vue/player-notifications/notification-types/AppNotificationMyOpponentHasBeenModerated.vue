<script setup lang="ts">
import { formatDistanceToNowStrict } from 'date-fns';
import { PlayerNotification } from '../../../../shared/app/models/index.js';
import { IconShieldCheck } from '../../icons.js';

defineProps({
    playerNotification: {
        type: PlayerNotification<'myOpponentHasBeenModerated'>,
        required: true,
    },
});
</script>

<template>
    <p class="text-info">
        <IconShieldCheck />

        {{ $t('notification.opponent_moderated', { player: playerNotification.parameters.player }) }}

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
