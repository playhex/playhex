<script setup lang="ts">
import { PropType } from 'vue';
import { PlayerNotification } from '../../../shared/app/models';

defineProps({
    playerNotifications: {
        type: Array as PropType<PlayerNotification[]>,
        required: true,
    },
});
</script>

<template>
    <span
        v-if="playerNotifications && playerNotifications.length > 0"
        class="badge bg-danger"
    >
        {{ playerNotifications.length }}
        <span class="visually-hidden">unread notifications</span>
    </span>
</template>
