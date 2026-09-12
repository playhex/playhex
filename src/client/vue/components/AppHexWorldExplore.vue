<script setup lang="ts">
import { computed, PropType, toRefs } from 'vue';
import { gameToHexworldLink } from '../../../shared/app/hexworld.js';
import useAuthStore from '../../stores/authStore.js';
import { GameView } from '@playhex/pixi-board';
import { canShowHexworldLink } from '../../../shared/app/gameUtils.js';
import Game from '../../../shared/app/models/Game.js';
import EngineGame from '../../../shared/game-engine/EngineGame.js';

const props = defineProps({
    game: {
        type: Object as PropType<Game>,
        required: true,
    },
    engineGame: {
        type: Object as PropType<EngineGame>,
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

const { game, label, orientation } = toRefs(props);
const { loggedInPlayer } = toRefs(useAuthStore());

const shouldDisplayHexworldLink = (): boolean => canShowHexworldLink(game.value, loggedInPlayer.value);

const hexworldLink = computed(() => gameToHexworldLink(
    game.value,
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
