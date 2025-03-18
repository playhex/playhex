<script setup lang="ts">
/* eslint-env browser */
import GameView from '../../../shared/pixi-board/GameView.js';
import { onMounted, onUnmounted, ref, Ref, PropType, toRefs } from 'vue';
import { BIconCheck, BIconChevronBarLeft, BIconChevronBarRight, BIconChevronLeft, BIconChevronRight, BIconCrosshair, BIconScissors, BIconTrophyFill, BIconX } from 'bootstrap-icons-vue';
import GameFinishedOverlay from './overlay/GameFinishedOverlay.vue';
import { defineOverlay } from '@overlastic/vue';
import AppChrono from './AppChrono.vue';
import AppPseudo from './AppPseudo.vue';
import { Player } from '../../../shared/app/models/index.js';
import TimeControlType from '../../../shared/time-control/TimeControlType.js';
import { GameTimeData } from '../../../shared/time-control/TimeControl.js';
import useConditionalMovesStore from '../../stores/conditionalMovesStore.js';
import { storeToRefs } from 'pinia';

const pixiApp = ref<HTMLElement>();

const props = defineProps({
    players: {
        type: Array as PropType<(null | Player)[]>,
        required: true,
    },
    timeControlOptions: {
        type: Object as PropType<TimeControlType>,
        required: false,
        default: null,
    },
    timeControlValues: {
        type: Object as PropType<GameTimeData>,
        required: false,
        default: null,
    },
    gameView: {
        type: GameView,
        required: true,
    },
});

const { gameView } = props;
const { players, timeControlOptions, timeControlValues } = toRefs(props);

/*
 * Add piwi view
 */
const game = gameView.getGame();

onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    gameView.mount(pixiApp.value);
});

onUnmounted(() => {
    gameView.destroy();
});

/*
 * Orientation auto update on screen size change
 */
let orientation = ref<number>(gameView.getCurrentOrientation());

const updateOrientation = () => orientation.value = gameView.getCurrentOrientation();

gameView.on('orientationChanged', updateOrientation);

onUnmounted(() => {
    gameView.off('orientationChanged', updateOrientation);
});

/*
 * Game end: win popin
 */
const gameFinishedOverlay = defineOverlay(GameFinishedOverlay);

gameView.on('endedAndWinAnimationOver', () => {
    gameFinishedOverlay({
        game,
        players: players.value,
    });
});

onUnmounted(() => gameView.removeAllListeners('endedAndWinAnimationOver'));

/*
 * Rewind
 */
gameView.listenArrowKeys();

const hasRewindControls = ref(false);

const btnRewindBack = ref<HTMLElement>();
const btnRewindForward = ref<HTMLElement>();

const blinkButton = (button: Ref<HTMLElement | undefined>) => {
    button.value?.classList.add('active');
    setTimeout(() => button.value?.classList.remove('active'), 80);
};

gameView.on('movesHistoryCursorChanged', cursor => hasRewindControls.value = null !== cursor);

const rewindZero = () => gameView.setMovesHistoryCursor(-1);
const backward = () => gameView.changeMovesHistoryCursor(-1);
const forward = () => gameView.changeMovesHistoryCursor(+1);
const rewindCurrent = () => gameView.setMovesHistoryCursor(Infinity);
const rewindClose = () => {
    gameView.disableRewindMode();
};

const keyboardEventListener = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement | null)?.nodeName === 'INPUT')
        return;
    switch (event.key) {
        case 'ArrowLeft':
            blinkButton(btnRewindBack);
            break;

        case 'ArrowRight':
            blinkButton(btnRewindForward);
            break;
    }
};

window.addEventListener('keydown', keyboardEventListener);

onUnmounted(() => {
    window.removeEventListener('keydown', keyboardEventListener);
});

/*
 * Conditional moves
 */
const { conditionalMovesEditor } = storeToRefs(useConditionalMovesStore());
</script>

<template>
    <div class="app-board" :class="{ 'has-rewind-controls': hasRewindControls || conditionalMovesEditor?.getIsSimulationMode() }">
        <div class="board-container" ref="pixiApp"></div>

        <div v-if="game" :class="['game-info-overlay', `orientation-${orientation}`]">
            <div class="player player-a">
                <p class="h5" v-if="players">
                    <AppPseudo
                        v-if="players[0]"
                        rating
                        onlineStatus
                        :player="players[0]"
                        classes="text-danger"
                    />
                    <span v-else class="fst-italic">{{ $t('waiting') }}</span>
                    <span v-if="game.getWinner() === 0">&nbsp;<BIconTrophyFill class="text-warning" /></span>
                </p>
                <AppChrono
                    v-if="timeControlOptions && timeControlValues"
                    :timeControlOptions="timeControlOptions"
                    :playerTimeData="timeControlValues.players[0]"
                />
            </div>
            <div class="player player-b">
                <p class="h5" v-if="players">
                    <span v-if="game.getWinner() === 1"><BIconTrophyFill class="text-warning" />&nbsp;</span>
                    <AppPseudo
                        v-if="players[1]"
                        rating
                        onlineStatus
                        :player="players[1]"
                        classes="text-primary"
                    />
                    <span v-else class="fst-italic">{{ $t('waiting') }}</span>
                </p>
                <AppChrono
                    v-if="timeControlOptions && timeControlValues"
                    :timeControlOptions="timeControlOptions"
                    :playerTimeData="timeControlValues.players[1]"
                />
            </div>
        </div>
        <p v-else>{{ $t('initializing_game') }}</p>

        <div class="rewind-controls" v-if="hasRewindControls">
            <!-- backward initial -->
            <button type="button" @click="rewindZero()" class="btn btn-outline-primary">
                <BIconChevronBarLeft />
            </button>

            <!-- backward -->
            <button type="button" @click="backward()" class="btn btn-outline-primary" ref="btnRewindBack">
                <BIconChevronLeft />
            </button>

            <!-- forward -->
            <button type="button" @click="forward()" class="btn btn-outline-primary" ref="btnRewindForward">
                <BIconChevronRight />
            </button>

            <!-- forward max -->
            <button type="button" @click="rewindCurrent()" class="btn btn-outline-primary">
                <BIconChevronBarRight />
            </button>

            <!-- Close rewind -->
            <button type="button" @click="rewindClose()" class="btn btn-outline-danger">
                <BIconX />
            </button>
        </div>

        <div class="rewind-controls" v-else-if="conditionalMovesEditor?.getIsSimulationMode()">

            <!-- Back to original position -->
            <button type="button" @click="conditionalMovesEditor.startNewLine()" class="btn btn-outline-primary">
                <BIconCrosshair />
            </button>

            <!-- backward -->
            <button type="button" @click="conditionalMovesEditor.back()" class="btn btn-outline-primary">
                <BIconChevronLeft />
            </button>

            <!-- Cut move -->
            <button type="button" @click="conditionalMovesEditor.cutMove()" class="btn btn-outline-danger" :disabled="0 === conditionalMovesEditor.getSelectedLine().length">
                <BIconScissors />
            </button>

            <!-- Save -->
            <button type="button" @click="conditionalMovesEditor.submitConditionalMoves()" class="btn" :class="conditionalMovesEditor.getHasChanges() ? 'btn-success' : 'btn-outline-success'">
                <BIconCheck /> Save
            </button>

            <!-- Close conditional moves edition -->
            <button type="button" @click="conditionalMovesEditor.discardSimulationMoves(); gameView!.disableSimulationMode()" class="btn btn-outline-warning">
                <BIconX />
            </button>
        </div>
    </div>
</template>

<style scoped lang="stylus">
.app-board
    position relative
    width 100%
    height 100%
    transition height 0.15s ease-out

.board-container
    display flex
    justify-content center
    width 100%
    height 100%

.player
    display flex
    flex-direction column
    position absolute
    height auto
    max-width 30%
    margin 0.75rem // To align with bootstrap navbar/container

    p
        margin 0

// Default, top left, top right
.player-a
    left 0
    top 0

.player-b
    text-align right
    right 0
    top 0

// Put left player to bottom
.orientation-0,
.orientation-1,
.orientation-6,
.orientation-7
    .player-a
        flex-direction column-reverse
        top auto
        bottom 0

// Put right player to bottom
.orientation-3,
.orientation-4,
.orientation-9,
.orientation-10
    .player-b
        flex-direction column-reverse
        top auto
        bottom 0

.app-board.has-rewind-controls
    height calc(100% - 3rem)

    .rewind-controls
        display flex
        justify-content center
        gap 0.25em
</style>
