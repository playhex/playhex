<script setup lang="ts">
import { computed, PropType, toRefs } from 'vue';
import { gameToHexworldLink } from '../../../shared/app/hexworld.js';
import useAuthStore from '../../stores/authStore.js';
import GameView from '../../../shared/pixi-board/GameView.js';
import { canUseHexWorldOrDownloadSGF } from '../../../shared/app/hostedGameUtils.js';
import HostedGame from '../../../shared/app/models/HostedGame.js';
import Game from '../../../shared/game-engine/Game.js';

const props = defineProps({
    hostedGame: {
        type: Object as PropType<HostedGame>,
        required: true,
    },
    game: {
        type: Object as PropType<Game>,
        required: true,
    },
    orientation: {
        type: [null, Number] as PropType<null | number>,
        required: false,
        default: null,
    },
    label: {
        type: String,
        required: false,
        default: 'HexWorld',
    },
});

const { hostedGame, label, orientation } = toRefs(props);
const { loggedInPlayer } = toRefs(useAuthStore());

const shouldDisplayHexworldLink = (): boolean => {
    if (!loggedInPlayer.value) {
        return false;
    }

    return canUseHexWorldOrDownloadSGF(hostedGame.value, loggedInPlayer.value);
};

const hexworldLink = computed(() => gameToHexworldLink(
    hostedGame.value,
    orientation.value ?? GameView.ORIENTATION_DIAMOND,
));
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
