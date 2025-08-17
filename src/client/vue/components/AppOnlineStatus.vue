<script setup lang="ts">
import Player from '../../../shared/app/models/Player.js';
import useOnlinePlayersStore from '../../stores/onlinePlayersStore.js';
import { PropType } from 'vue';
import { IconMoonFill, IconCircleFill, IconRobot, IconCircle } from '../icons';

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

const onlinePlayersStore = useOnlinePlayersStore();
</script>

<template>
    <IconRobot
        v-if="props.player.isBot"
        class="me-1 text-success"
        aria-hidden="true"
    />
    <IconCircle
        v-else-if="!onlinePlayersStore.isPlayerOnline(props.player.publicId)"
        class="lower me-1 text-secondary"
        aria-hidden="true"
    />
    <IconCircleFill
        v-else-if="onlinePlayersStore.isPlayerActive(props.player.publicId)"
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
