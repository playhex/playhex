<script setup lang="ts">
import { computed, PropType, toRefs } from 'vue';
import { createHexworldString } from '../../../../shared/app/hexworld.js';
import useAuthStore from '../../../stores/authStore.js';
import { GameView } from '@playhex/pixi-board';
import { canShowHexplorerLink, getAnalyzeTogetherOpponent, getPlayers } from '../../../../shared/app/gameUtils.js';
import { Game } from '../../../../shared/app/models/index.js';
import { HEXPLORER_ANALYZE_TOGETHER_STATE_KEY, HEXPLORER_TAB_STATE_KEY, type HexplorerAnalyzeTogether } from '../HexplorerState.js';
import { IconDiagram2, IconPeople, IconPlayFill } from '../../icons.js';

/*
 * Links that redirect to Hexplorer, and initialize position to this game:
 * to analyze it, alone or with opponent (streams it and invites opponent to edit it),
 * or to play from a position (opens Play tab).
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

const hash = () => '#' + createHexworldString(game.value, orientation.value ?? GameView.ORIENTATION_DIAMOND);

const to = (tab?: 'play') => ({
    name: 'hexplorer',
    hash: hash(),
    state: tab === undefined ? {} : { [HEXPLORER_TAB_STATE_KEY]: tab },
});

/**
 * Link to analyze with opponent, null if not played against a human.
 */
const toAnalyzeTogether = computed(() => {
    const opponent = getAnalyzeTogetherOpponent(game.value, loggedInPlayer.value);

    if (opponent === null) {
        return null;
    }

    const [red, blue] = getPlayers(game.value).map(player => player.pseudo);

    const analyzeTogether: HexplorerAnalyzeTogether = {
        playerPublicId: opponent.publicId,
        title: `${red} - ${blue}`,
        playerNames: [red, blue],
    };

    return {
        name: 'hexplorer',
        hash: hash(),
        state: { [HEXPLORER_ANALYZE_TOGETHER_STATE_KEY]: analyzeTogether },
    };
});
</script>

<template>
    <template v-if="shouldDisplayLink()">
        <router-link v-bind="$attrs" :to="to()"><IconDiagram2 /> {{ $t('hexplorer.analyze_in_hexplorer') }}</router-link>
        <router-link
            v-if="toAnalyzeTogether"
            v-bind="$attrs"
            :to="toAnalyzeTogether"
        ><IconPeople /> {{ $t('hexplorer.analyze_together') }}</router-link>
        <router-link v-bind="$attrs" :to="to('play')"><IconPlayFill /> {{ $t('hexplorer.play_from_position') }}</router-link>
    </template>
</template>
