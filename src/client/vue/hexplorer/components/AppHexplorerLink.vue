<script setup lang="ts">
import { PropType, toRefs } from 'vue';
import { createHexworldString } from '../../../../shared/app/hexworld.js';
import useAuthStore from '../../../stores/authStore.js';
import { GameView } from '@playhex/pixi-board';
import { canExportGame } from '../../../../shared/app/hostedGameUtils.js';
import { HostedGame } from '../../../../shared/app/models/index.js';

/*
 * Link that redirect to Hexplorer,
 * and initialize position to this hostedGame
 */

const props = defineProps({
    hostedGame: {
        type: Object as PropType<HostedGame>,
        required: true,
    },
    orientation: {
        type: [null, Number] as PropType<null | number>,
        required: false,
        default: null,
    },
});

const { hostedGame, orientation } = toRefs(props);
const { loggedInPlayer } = toRefs(useAuthStore());

const shouldDisplayLink = (): boolean => {
    if (!loggedInPlayer.value) {
        return false;
    }

    return canExportGame(hostedGame.value, loggedInPlayer.value);
};
</script>

<template>
    <router-link
        v-if="shouldDisplayLink()"
        :to="{
            name: 'hexplorer',
            hash: '#' + createHexworldString(hostedGame, orientation ?? GameView.ORIENTATION_DIAMOND),
        }"
    >{{ $t('hexplorer.title') }}</router-link>
</template>
