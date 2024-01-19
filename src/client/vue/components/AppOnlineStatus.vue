<script setup lang="ts">
import { PlayerData } from '@shared/app/Types';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore';
import { PropType, toRefs } from 'vue';
import { BIconCircleFill, BIconRobot } from 'bootstrap-icons-vue';

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
    <b-icon-circle-fill
        v-if="!playerData.isBot"
        class="online-status-icon"
        aria-hidden="true"
        :class="useOnlinePlayersStore().isPlayerOnline(playerData.publicId) ? 'text-success' : 'text-secondary'"
    />
    <b-icon-robot
        v-else
        class="me-1 text-success"
        aria-hidden="true"
    />
    <component :is="is" :class="classes">{{ playerData.pseudo }}</component>
</template>
