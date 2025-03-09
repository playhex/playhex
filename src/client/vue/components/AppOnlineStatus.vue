<script setup lang="ts">
import Player from '../../../shared/app/models/Player';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore';
import { PropType } from 'vue';
import { BIconCircleFill, BIconMoonFill, BIconRobot } from 'bootstrap-icons-vue';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

const onlinePlayersStore = useOnlinePlayersStore();
</script>

<template>
    <BIconRobot
        v-if="props.player.isBot"
        class="me-1 text-success"
        aria-hidden="true"
    />
    <BIconCircleFill
        v-else-if="!onlinePlayersStore.isPlayerOnline(props.player.publicId)"
        class="online-status-icon text-secondary"
        aria-hidden="true"
    />

    <!-- TODO remove this once active status fixed -->
    <BIconCircleFill
        v-else
        class="online-status-icon text-success"
        aria-hidden="true"
    />

    <!-- TODO restore this once active status fixed
        <BIconCircleFill
            v-else-if="onlinePlayersStore.isPlayerActive(props.player.publicId)"
            class="online-status-icon text-success"
            aria-hidden="true"
        />
        <BIconMoonFill
            v-else
            class="online-status-icon text-warning"
            aria-hidden="true"
        />
    -->
</template>
