<script setup lang="ts">
import { PropType, toRefs } from 'vue';
import { createHexworldString } from '../../../../shared/app/hexworld.js';
import useAuthStore from '../../../stores/authStore.js';
import { GameView } from '@playhex/pixi-board';
import { canShowHexplorerLink } from '../../../../shared/app/gameUtils.js';
import { Game } from '../../../../shared/app/models/index.js';
import { HEXPLORER_TAB_STATE_KEY } from '../HexplorerState.js';
import { IconDiagram2, IconPlayFill } from '../../icons.js';

/*
 * Links that redirect to Hexplorer, and initialize position to this game:
 * to analyze it, or to play from a position (opens Play tab).
 * Attributes (e.g classes) are set on both links.
 */

defineOptions({ inheritAttrs: false });

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

const to = (tab?: 'play') => ({
    name: 'hexplorer',
    hash: '#' + createHexworldString(game.value, orientation.value ?? GameView.ORIENTATION_DIAMOND),
    state: tab === undefined ? {} : { [HEXPLORER_TAB_STATE_KEY]: tab },
});
</script>

<template>
    <template v-if="shouldDisplayLink()">
        <router-link v-bind="$attrs" :to="to()"><IconDiagram2 /> {{ $t('hexplorer.analyze_in_hexplorer') }}</router-link>
        <router-link v-bind="$attrs" :to="to('play')"><IconPlayFill /> {{ $t('hexplorer.play_from_position') }}</router-link>
    </template>
</template>
