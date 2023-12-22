<script setup lang="ts">
import { PlayerData } from '@shared/app/Types';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore';
import { PropType, toRefs } from 'vue';

const props = defineProps({
    playerData: {
        type: Object as PropType<PlayerData>,
        required: true,
    },
    is: {
        type: String,
        default: 'span',
    },
    classes: {
        type: String,
        default: null,
    },
});

const { playerData, is, classes } = toRefs(props);
</script>

<template>
    <i
        v-if="!playerData.isBot"
        class="bi-circle-fill online-status-icon"
        aria-hidden="true"
        :class="useOnlinePlayersStore().isPlayerOnline(playerData.id) ? 'text-success' : 'text-secondary'"
    ></i>
    <i
        v-else
        class="bi-robot me-1 text-success"
        aria-hidden="true"
    ></i>
    <component :is="is" :class="classes">{{ playerData.pseudo }}</component>
</template>
