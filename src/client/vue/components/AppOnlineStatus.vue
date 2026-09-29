<script setup lang="ts">
import Player from '../../../shared/app/models/Player.js';
import { usePlayersOnlineStatus } from '../../stores/playerOnlineStatusStore.js';
import { PlayerOnlineStatus } from '../../../shared/app/Types.js';
import { computed, PropType } from 'vue';
import { IconMoonFill, IconCircleFill, IconRobot, IconCircle } from '../icons.js';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },

    /**
     * Display this status instead of watching player status.
     * Useful when status is already known, to prevent joining a room for each player.
     */
    status: {
        type: String as PropType<null | PlayerOnlineStatus>,
        default: null,
    },
});

const playerOnlineStatusStore = usePlayersOnlineStatus(() => props.player.isBot || props.status !== null
    ? []
    : [props.player.publicId],
);

const status = computed((): PlayerOnlineStatus => props.status ?? playerOnlineStatusStore.getStatus(props.player.publicId));
</script>

<template>
    <IconRobot
        v-if="props.player.isBot"
        class="me-1 text-success"
        aria-hidden="true"
    />
    <IconCircle
        v-else-if="status === 'offline'"
        class="lower me-1 text-secondary"
        aria-hidden="true"
    />
    <IconCircleFill
        v-else-if="status === 'active'"
        class="lower me-1 text-success"
        aria-hidden="true"
    />
    <IconMoonFill
        v-else
        class="lower me-1 text-warning"
        aria-hidden="true"
    />
</template>

<style lang="stylus" scoped>
.lower
    font-size 0.6em
</style>
