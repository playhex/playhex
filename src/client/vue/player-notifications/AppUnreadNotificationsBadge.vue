<script setup lang="ts">
import { PropType } from 'vue';
import { PlayerNotification } from '../../../shared/app/models/index.js';

defineProps({
    playerNotifications: {
        type: Array as PropType<PlayerNotification[]>,
        required: true,
    },

    /**
     * Whether there is more unread notifications than the ones loaded
     */
    hasMore: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <span
        v-if="playerNotifications && playerNotifications.length > 0"
        class="badge bg-danger"
    >
        {{ playerNotifications.length }}{{ hasMore ? '+' : '' }}
        <span class="visually-hidden">unread notifications</span>
    </span>
</template>
