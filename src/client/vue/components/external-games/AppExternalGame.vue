<script setup lang="ts">
import 'bootstrap/js/dist/dropdown.js';
import { PropType, toRefs } from 'vue';
import { storeToRefs } from 'pinia';
import { IconArrowBarLeft, IconList, IconRewind } from '../../icons.js';
import { ExternalGame } from '../../../../shared/app/models/index.js';
import Rooms from '../../../../shared/app/Rooms.js';
import useCurrentGameStore from '../../../stores/currentGameStore.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import { useGameViewOrientation } from '../../composables/useGameViewOrientation.js';
import { useSocketRoom } from '../../composables/useSocketRoom.js';
import AppBoard from '../AppBoard.vue';
import AppHexWorldExplore from '../AppHexWorldExplore.vue';
import AppHexplorerLink from '../../hexplorer/components/AppHexplorerLink.vue';
import AppExternalGameSidebar from './AppExternalGameSidebar.vue';

/*
 * External game (played outside PlayHex), read only.
 * Same layout as PagePlayRemote, without game actions nor chat.
 */

const props = defineProps({
    externalGame: {
        type: Object as PropType<ExternalGame>,
        required: true,
    },
});

const { externalGame } = toRefs(props);

const { engineGame, game, gameView, players } = storeToRefs(useCurrentGameStore());
const { useExternalGame, enableSimulationMode } = useCurrentGameStore();

useExternalGame(externalGame.value);

// To receive analyze updates
useSocketRoom(Rooms.externalGame(externalGame.value.publicId));

const orientation = useGameViewOrientation(gameView);

const { localSettings } = usePlayerLocalSettingsStore();

const showSidebar = (open = true): void => {
    localSettings.openSidebar = open;
};
</script>

<template>
    <div class="game-and-sidebar-container" :class="localSettings.openSidebar ? 'sidebar-open' : (undefined === localSettings.openSidebar ? 'sidebar-auto' : 'sidebar-closed')">
        <div class="game bg-body">
            <div class="board-container">
                <AppBoard
                    v-if="game"
                    :players
                    :gameView="gameView"
                    plainNames
                />
            </div>

            <nav class="menu-game navbar" v-if="game">
                <div class="buttons container-fluid">
                    <div class="buttons-side" aria-hidden="true"></div>

                    <div class="buttons-main">

                        <!-- rewind mode -->
                        <button type="button" v-if="null !== gameView" @click="() => enableSimulationMode()" class="btn btn-outline-primary">
                            <IconRewind />
                        </button>

                        <!-- Secondary actions dropup -->
                        <div class="dropup" v-if="engineGame">
                            <button type="button" class="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" aria-label="Secondary actions" aria-expanded="false" data-bs-auto-close="true">
                                <IconList />
                            </button>

                            <div class="dropdown-menu dropdown-menu-end">
                                <AppHexWorldExplore
                                    :game
                                    :engineGame
                                    :orientation
                                    :label="$t('explore')"
                                    class="dropdown-item"
                                />

                                <AppHexplorerLink
                                    :game
                                    :orientation
                                    class="dropdown-item"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="buttons-side buttons-side-right">
                        <button type="button" class="btn btn-outline-primary" @click="showSidebar()" aria-label="Open game sidebar">
                            <IconArrowBarLeft />
                        </button>
                    </div>
                </div>
            </nav>
        </div>

        <div class="sidebar bg-body" v-if="game && gameView">
            <AppExternalGameSidebar
                :externalGame
                :game
                :gameView
                @close="showSidebar(false)"
            />
        </div>
    </div>
</template>

<style scoped lang="stylus">
.board-container
    position relative
    height calc(100vh - 6rem) // (fallback if dvh is not supported)
    height calc(100dvh - 6rem) // 6rem = header and bottom game menu height

.menu-game
    margin-bottom calc(100lvh - 100dvh)

.buttons
    position relative
    display flex
    flex-wrap nowrap
    align-items center
    justify-content center
    gap 0.5em

    .dropdown-menu
        max-width calc(100vw - 1rem)

.buttons-side
    display flex
    flex 1 1 0
    min-width 0

.buttons-side-right
    justify-content flex-end
    min-width min-content

.buttons-main
    display flex
    flex-wrap nowrap
    flex 0 0 auto
    justify-content center
    gap 0.5em

.game-and-sidebar-container
    position relative
    display flex

    .game
        width 100%

    .sidebar
        display none
        height calc(100vh - 3rem) // (fallback if dvh is not supported)
        height calc(100dvh - 3rem) // 3rem = header height

sidebarOpen()
    .game
        width 100%

        @media (min-width: 576px)
            width 50%

        @media (min-width: 992px)
            width 55%

        @media (min-width: 1200px)
            width 64%

        @media (min-width: 1400px)
            width 68%

    .sidebar
        display flex
        position relative
        width 100%

        @media (max-width: 575.5px)
            position absolute
            right 0
            top 0
            bottom 0
            --bs-bg-opacity 0.85

        @media (min-width: 576px)
            width 50%

        @media (min-width: 992px)
            width 45%

        @media (min-width: 1200px)
            width 36%

        @media (min-width: 1400px)
            width 32%

    .buttons-side
        display none

.sidebar-open
    sidebarOpen()

.sidebar-auto
    @media (min-width: 576px)
        sidebarOpen()
</style>
