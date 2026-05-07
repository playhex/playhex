<script setup lang="ts">
import { PlayerNotification } from '../../../shared/app/models/index.js';
import AppNotificationChatMessage from './notification-types/AppNotificationChatMessage.vue';
import AppNotificationCustom from './notification-types/AppNotificationCustom.vue';
import AppNotificationFallback from './notification-types/AppNotificationFallback.vue';
import AppNotificationGameCanceled from './notification-types/AppNotificationGameCanceled.vue';
import AppNotificationGameEnded from './notification-types/AppNotificationGameEnded.vue';
import AppNotificationMyOpponentHasBeenModerated from './notification-types/AppNotificationMyOpponentHasBeenModerated.vue';

defineProps({
    playerNotification: {
        type: PlayerNotification,
        required: true,
    },
});
</script>

<template>
    <AppNotificationChatMessage
        v-if="playerNotification.type === 'chatMessage'"
        :playerNotification="(playerNotification as PlayerNotification<'chatMessage'>)"
    />
    <AppNotificationGameEnded
        v-else-if="playerNotification.type === 'gameEnded'"
        :playerNotification="(playerNotification as PlayerNotification<'gameEnded'>)"
    />
    <AppNotificationGameCanceled
        v-else-if="playerNotification.type === 'gameCanceled'"
        :playerNotification="(playerNotification as PlayerNotification<'gameCanceled'>)"
    />
    <AppNotificationMyOpponentHasBeenModerated
        v-else-if="playerNotification.type === 'myOpponentHasBeenModerated'"
        :playerNotification="(playerNotification as PlayerNotification<'myOpponentHasBeenModerated'>)"
    />
    <AppNotificationCustom
        v-else-if="playerNotification.type === 'custom'"
        :playerNotification="(playerNotification as PlayerNotification<'custom'>)"
    />
    <AppNotificationFallback
        v-else
        :playerNotification
    />
</template>
