<script setup lang="ts">
import { IconChatDots } from '../../icons';
import { PlayerNotification } from '../../../../shared/app/models';
import { formatDistanceToNowStrict } from 'date-fns';

defineProps({
    playerNotification: {
        type: PlayerNotification<'chatMessage'>,
        required: true,
    },
});
</script>

<template>
    <p>
        <IconChatDots />

        {{ playerNotification.parameters.player }}
        <span class="ms-2">
            <small class="fst-italic">{{ playerNotification.parameters.text }}</small>
        </span>

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
