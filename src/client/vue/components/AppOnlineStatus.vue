<script setup lang="ts">
import Player from '../../../shared/app/models/Player';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore';
import { PropType } from 'vue';
import { BIconCircleFill, BIconRobot } from 'bootstrap-icons-vue';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

const onlinePlayersStore = useOnlinePlayersStore();
</script>

<template>
    <BIconCircleFill
        v-if="!props.player.isBot"
        class="online-status-icon"
        aria-hidden="true"
        :class="onlinePlayersStore.isPlayerOnline(props.player.publicId) ? 'text-success' : 'text-secondary'"
    />
    <BIconRobot
        v-else
        class="me-1 text-success"
        aria-hidden="true"
    />
</template>
