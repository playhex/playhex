<script setup lang="ts">
import { PropType, ref, toRefs, watchEffect } from 'vue';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';
import { gameToHexworldLink } from '../../../shared/app/hexworld.js';
import HostedGameClient from '../../HostedGameClient.js';
import useAuthStore from '../../stores/authStore.js';
import GameView from '../../../shared/pixi-board/GameView.js';

const props = defineProps({
    hostedGameClient: {
        type: Object as PropType<HostedGameClient>,
        required: true,
    },
    gameView: {
        type: Object as PropType<GameView>,
        required: true,
    },
    label: {
        type: String,
        required: false,
        default: 'HexWorld',
    },
});

const { hostedGameClient } = toRefs(props);
const { gameView, label } = props;
const { loggedInPlayer } = toRefs(useAuthStore());

const shouldDisplayHexworldLink = (): boolean => {
    if (null === hostedGameClient.value || null === loggedInPlayer.value) {
        return true;
    }

    if (!hostedGameClient.value.isRanked()) {
        return true;
    }

    if (['ended', 'canceled', 'forfeited'].includes(hostedGameClient.value.getState())) {
        return true;
    }

    if ('correspondence' === timeControlToCadencyName(hostedGameClient.value.getGameOptions())) {
        return true;
    }

    if (hostedGameClient.value.getState() === 'playing') {
        return !hostedGameClient.value.hasPlayer(loggedInPlayer.value) && !loggedInPlayer.value.isGuest;
    }

    return false;
};

const generateHexworldLink = () => gameToHexworldLink(
    hostedGameClient.value.getGame(),
    gameView.getComputedBoardOrientation(),
);

const hexworldLink = ref(generateHexworldLink());

watchEffect(() => {
    hexworldLink.value = generateHexworldLink();
});

gameView.on('orientationChanged', () => hexworldLink.value = generateHexworldLink());
</script>

<template>
    <a
        v-if="shouldDisplayHexworldLink()"
        target="_blank"
        :href="hexworldLink"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.4em"
            height="1.4em"
            viewBox="0 0 26 27"
            fill="#d8b47d"
            stroke="#000000"
            stroke-width="1"
            role="img"
            focusable="false"
        >
            <path d="M 3 8 L 13 2.25 L 23 8 L 23 19.5 L 13 25.25 L 3 19.5z" />
        </svg>
        {{ label }}
    </a>
</template>
