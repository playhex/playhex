<script setup lang="ts">
import { PlayerNotification } from '../../../../shared/app/models/index.js';
import { formatDistanceToNowStrict } from 'date-fns';

defineProps({
    playerNotification: {
        type: PlayerNotification<'gameCanceled'>,
        required: true,
    },
});
</script>

<template>
    <p>
        <span class="text-warning">
            {{ $t('game_has_been_canceled') }}
        </span>

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
