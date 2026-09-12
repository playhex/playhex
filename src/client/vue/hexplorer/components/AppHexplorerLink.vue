<script setup lang="ts">
import { PropType, toRefs } from 'vue';
import { createHexworldString } from '../../../../shared/app/hexworld.js';
import useAuthStore from '../../../stores/authStore.js';
import { GameView } from '@playhex/pixi-board';
import { canShowHexplorerLink } from '../../../../shared/app/gameUtils.js';
import { Game } from '../../../../shared/app/models/index.js';

/*
 * Link that redirect to Hexplorer,
 * and initialize position to this game
 */

const props = defineProps({
    game: {
        type: Object as PropType<Game>,
        required: true,
    },
    orientation: {
        type: [null, Number] as PropType<null | number>,
        required: false,
        default: null,
    },
});

const { game, orientation } = toRefs(props);
const { loggedInPlayer } = toRefs(useAuthStore());

const shouldDisplayLink = (): boolean => canShowHexplorerLink(game.value, loggedInPlayer.value);
</script>

<template>
    <router-link
        v-if="shouldDisplayLink()"
        :to="{
            name: 'hexplorer',
            hash: '#' + createHexworldString(game, orientation ?? GameView.ORIENTATION_DIAMOND),
        }"
    >{{ $t('hexplorer.title') }}</router-link>
</template>
