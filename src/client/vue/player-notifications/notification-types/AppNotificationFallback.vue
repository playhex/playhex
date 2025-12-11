<script lang="ts">
/**
 * If there is no notification component for a notification type,
 * displays it as raw instead of not displaying it.
 */
export default {};
</script>

<script setup lang="ts">
import { formatDistanceToNowStrict } from 'date-fns';
import { PlayerNotification } from '../../../../shared/app/models/index.js';

defineProps({
    playerNotification: {
        type: PlayerNotification,
        required: true,
    },
});
</script>

<template>
    <p>
        ?
        {{ playerNotification.type }}
        {{ playerNotification.parameters }}

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
