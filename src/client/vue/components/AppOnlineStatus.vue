<script setup lang="ts">
import Player from '../../../shared/app/models/Player';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore';
import { PropType, toRefs } from 'vue';
import { BIconCircleFill, BIconRobot } from 'bootstrap-icons-vue';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

const { player } = toRefs(props);
</script>

<template>
    <BIconCircleFill
        v-if="!player.isBot"
        class="online-status-icon"
        aria-hidden="true"
        :class="useOnlinePlayersStore().isPlayerOnline(player.publicId) ? 'text-success' : 'text-secondary'"
    />
    <BIconRobot
        v-else
        class="me-1 text-success"
        aria-hidden="true"
    />
</template>
