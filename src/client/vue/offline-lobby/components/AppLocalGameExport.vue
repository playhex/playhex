<script setup lang="ts">
import { PropType } from 'vue';
import { EngineGame } from '../../../../shared/game-engine/index.js';
import { downloadLocalGameSGF, localGameToHexplorerHash, localGameToHexworldLink } from '../services/localGameExport.js';
import { IconDownload } from '../../icons.js';

/**
 * Buttons to download a local game as SGF, or open it in HexWorld or Hexplorer.
 */
const props = defineProps({
    game: {
        type: EngineGame,
        required: true,
    },

    /**
     * Players pseudos, indexed by color.
     */
    pseudos: {
        type: Array as unknown as PropType<[string, string]>,
        required: true,
    },

    /**
     * Board orientation to use in HexWorld and Hexplorer.
     */
    orientation: {
        type: Number,
        default: 11,
    },
});

const downloadSGF = () => downloadLocalGameSGF(props.game, props.pseudos);
</script>

<template>
    <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="downloadSGF">
            <IconDownload /> SGF
        </button>
        <a
            class="btn btn-sm btn-outline-secondary"
            target="_blank"
            :href="localGameToHexworldLink(game, orientation)"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.2em"
                height="1.2em"
                viewBox="0 0 26 27"
                fill="#d8b47d"
                stroke="#000000"
                stroke-width="1"
                role="img"
                focusable="false"
            >
                <path d="M 3 8 L 13 2.25 L 23 8 L 23 19.5 L 13 25.25 L 3 19.5z" />
            </svg>
            HexWorld
        </a>
        <router-link
            class="btn btn-sm btn-outline-secondary"
            :to="{ name: 'hexplorer', hash: localGameToHexplorerHash(game, orientation) }"
        >{{ $t('hexplorer.title') }}</router-link>
    </div>
</template>
