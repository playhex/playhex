<script setup lang="ts">
import { computed, onMounted, onUnmounted, PropType, ref } from 'vue';
import { storeToRefs } from 'pinia';
import AppBoardsize from '../../components/overlay/create-game/AppBoardsize.vue';
import AppSwapRule from '../../components/overlay/create-game/AppSwapRule.vue';
import AppLocalTimeControlSelect from './AppLocalTimeControlSelect.vue';
import { Local1v1GameOptions } from '../models/Local1v1GameOptions.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import AppRhombus from '../../components/AppRhombus.vue';
import AppLocalDisplayModeSelect from './AppLocalDisplayModeSelect.vue';
import AppLocalGameExport from './AppLocalGameExport.vue';
import { localBoardDisplay } from '../services/localBoardDisplay.js';
import { EngineGame } from '../../../../shared/game-engine/index.js';
import { LocalPlayerActions, Seat } from '../models/Local1v1Game.js';
import { IconAlphabet, IconArrowCounterclockwise, IconArrowDownUp, IconArrowLeft, IconArrowClockwise, IconFlag, IconRewind } from '../../icons.js';

/**
 * Options for next game, edited from this menu.
 */
const nextGameOptions = defineModel<Local1v1GameOptions>('nextGameOptions', {
    required: true,
});

const props = defineProps({
    tabletop: {
        type: Boolean,
        required: true,
    },

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
     * Players actions, top player first.
     */
    players: {
        type: Array as PropType<LocalPlayerActions[]>,
        required: true,
    },

    /**
     * Game is finished, show rematch button.
     */
    canRematch: {
        type: Boolean,
        default: false,
    },

    /**
     * Current board orientation, used for HexWorld and Hexplorer links.
     */
    orientation: {
        type: Number,
        default: 11,
    },
});

const emit = defineEmits<{
    close: [];
    setTabletop: [tabletop: boolean];
    swapColors: [];
    restart: [];
    toggleCoords: [];
    simulation: [];
    undo: [seat: Seat];
    pass: [seat: Seat];
    resign: [seat: Seat];
    rematch: [];
}>();

const tabletopModel = computed({
    get: () => props.tabletop,
    set: (tabletop: boolean) => emit('setTabletop', tabletop),
});

const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

const soundEnabled = computed({
    get: () => !localSettings.value.muteAudio,
    set: (enabled: boolean) => localSettings.value.muteAudio = !enabled,
});

/*
 * Fullscreen
 */
const fullscreenAvailable = typeof document !== 'undefined' && document.fullscreenEnabled;
const isFullscreen = ref(false);

const refreshFullscreen = () => isFullscreen.value = document.fullscreenElement !== null;

const setFullscreen = async (fullscreen: boolean): Promise<void> => {
    try {
        if (!fullscreen && document.fullscreenElement) {
            await document.exitFullscreen();
        } else if (fullscreen && !document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        }
    } catch (e) {
        // noop, browser refused fullscreen
    }
};

onMounted(() => {
    refreshFullscreen();
    document.addEventListener('fullscreenchange', refreshFullscreen);
});

onUnmounted(() => document.removeEventListener('fullscreenchange', refreshFullscreen));
</script>

<template>
    <div class="offcanvas offcanvas-end show local-1v1-menu" tabindex="-1">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title">{{ $t('local_play.menu') }}</h5>
            <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>
        <div class="offcanvas-body">
            <div v-if="canRematch" class="d-grid mb-3">
                <button type="button" class="btn btn-success" @click="emit('rematch')">{{ $t('rematch.label') }}</button>
            </div>

            <div v-for="player in players" :key="player.seat" class="mb-3">
                <h6 class="player-name">
                    <span class="stone" :class="0 === player.playerIndex ? 'bg-danger' : 'bg-primary'"></span>
                    <span class="text-truncate">{{ player.name }}</span>
                </h6>

                <div class="d-flex flex-wrap gap-2">
                    <button type="button" class="btn btn-sm btn-warning" :disabled="!player.canUndo" @click="emit('undo', player.seat)">
                        <IconArrowCounterclockwise /> {{ $t('undo.undo_move') }}
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" :disabled="!player.canPass" @click="emit('pass', player.seat)">
                        {{ $t('pass') }}
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger" :disabled="!player.canResign" @click="emit('resign', player.seat)">
                        <IconFlag /> {{ $t('resign') }}
                    </button>
                </div>
            </div>

            <div class="border-top pt-3 mb-4">
                <AppLocalDisplayModeSelect v-model="tabletopModel" class="mb-3" />

                <div v-if="fullscreenAvailable" class="form-check form-switch">
                    <input
                        :checked="isFullscreen"
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="local-fullscreen"
                        @change="e => setFullscreen((e.target as HTMLInputElement).checked)"
                    >
                    <label class="form-check-label" for="local-fullscreen">{{ $t('local_play.fullscreen') }}</label>
                </div>

                <div class="form-check form-switch">
                    <input v-model="soundEnabled" class="form-check-input" type="checkbox" role="switch" id="local-sound">
                    <label class="form-check-label" for="local-sound">{{ $t('local_play.sound') }}</label>
                </div>
            </div>

            <div class="d-grid gap-2 mb-4">
                <button type="button" class="btn btn-outline-primary text-start" @click="emit('swapColors')">
                    <IconArrowDownUp class="me-2" />
                    {{ $t('local_play.swap_colors') }}
                </button>
                <button type="button" class="btn btn-outline-primary text-start" @click="emit('simulation')">
                    <IconRewind class="me-2" />
                    {{ $t('local_play.simulation') }}
                </button>
                <button type="button" class="btn btn-outline-warning text-start" @click="emit('restart')">
                    <IconArrowClockwise class="me-2" />
                    {{ $t('restart') }}
                </button>
                <router-link :to="{ name: 'offline-lobby' }" class="btn btn-outline-secondary text-start">
                    <IconArrowLeft class="me-2" />
                    {{ $t('back_to_menu') }}
                </router-link>
            </div>

            <div class="border-top pt-3 mb-4">
                <h6>{{ $t('board_orientation.title') }}</h6>

                <div class="btn-group w-100 mb-3" role="group">
                    <template v-for="{ value, orientation: rhombusOrientation, label } in [
                        { value: 'flat', orientation: 0, label: 'board_orientation.flat' },
                        { value: 'diamond', orientation: 11, label: 'board_orientation.diamond' },
                    ] as const" :key="value">
                        <input
                            v-model="localBoardDisplay.orientation"
                            type="radio"
                            class="btn-check"
                            :value="value"
                            :id="'local-orientation-' + value"
                            autocomplete="off"
                        >
                        <label class="btn local-choice-card" :for="'local-orientation-' + value">
                            <AppRhombus :orientation="rhombusOrientation" />
                            <span>{{ $t(label) }}</span>
                        </label>
                    </template>
                </div>

                <div>
                    <button type="button" class="btn btn-outline-primary" @click="emit('toggleCoords')">
                        <IconAlphabet class="me-2" />
                        {{ $t('toggle_coords_short') }}
                    </button>
                </div>
            </div>

            <div class="border-top pt-3 mb-4">
                <h6>{{ $t('local_play.export_game') }}</h6>

                <AppLocalGameExport :game :pseudos :orientation />
            </div>

            <div class="border-top pt-3">
                <p class="text-secondary"><small>{{ $t('local_play.applies_next_game') }}</small></p>

                <div class="mb-3">
                    <AppBoardsize v-model="nextGameOptions.boardsize" />
                </div>

                <div class="mb-3">
                    <AppLocalTimeControlSelect v-model="nextGameOptions.timeControl" />
                </div>

                <div class="mb-3">
                    <AppSwapRule v-model="nextGameOptions.swapRule" />
                </div>

                <button type="button" class="btn btn-success w-100" @click="emit('restart')">{{ $t('local_play.restart_with_settings') }}</button>
            </div>
        </div>
    </div>
    <div class="offcanvas-backdrop fade show" @click="emit('close')"></div>
</template>

<style lang="stylus" scoped>
.local-1v1-menu
    visibility visible

.player-name
    display flex
    align-items center
    gap 0.5em
    font-weight bold

.stone
    flex-shrink 0
    width 1em
    height 1em
    border-radius 50%

.local-choice-card
    display flex
    flex-direction column
    align-items center
    gap 0.25em
</style>
