<script lang="ts">
/**
 * Some custom notification to display any text.
 * Not sure what I'll do with this.
 */
export default {};
</script>

<script setup lang="ts">
import { formatDistanceToNowStrict } from 'date-fns';
import { PlayerNotification } from '../../../../shared/app/models';

defineProps({
    playerNotification: {
        type: PlayerNotification<'custom'>,
        required: true,
    },
});
</script>

<template>
    <p>
        {{ playerNotification.parameters.text }}

        <small class="float-end text-secondary">{{ formatDistanceToNowStrict(playerNotification.createdAt, {
            addSuffix: true,
        }) }}</small>
    </p>
</template>
