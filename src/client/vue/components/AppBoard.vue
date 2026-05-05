<script setup lang="ts">
import { onMounted, onUnmounted, ref, Ref, PropType, toRefs } from 'vue';
import { storeToRefs } from 'pinia';
import { IconCheck, IconChevronBarLeft, IconChevronBarRight, IconChevronLeft, IconChevronRight, IconCrosshair, IconScissors, IconTrophyFill, IconX } from '../icons.js';
import AppChrono from './AppChrono.vue';
import AppPseudo from './AppPseudo.vue';
import { Player } from '../../../shared/app/models/index.js';
import TimeControlType from '../../../shared/time-control/TimeControlType.js';
import { GameTimeData } from '../../../shared/time-control/TimeControl.js';
import useCurrentGameStore from '../../stores/currentGameStore.js';
import { useGameViewOrientation } from '../composables/useGameViewOrientation.js';

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
});

const {
    players,
    timeControlOptions,
    timeControlValues,
} = toRefs(props);

const {
    game,
    gameView,
    conditionalMovesEditor,
    gameUIMode,
} = storeToRefs(useCurrentGameStore());

const {
    stopConditionalMoves,
    enableSimulationMode,
    disableSimulationMode,
} = useCurrentGameStore();

/*
 * Add pixi view
 */
onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    if (!gameView.value) {
        throw new Error('no game view');
    }

    void gameView.value.mount(pixiApp.value);
});

onUnmounted(() => {
    gameView.value?.destroy();
});

const orientation = useGameViewOrientation(gameView);

/*
 * Simulation mode
 */

const btnRewindBack = ref<HTMLElement>();
const btnRewindForward = ref<HTMLElement>();

const blinkButton = (button: Ref<HTMLElement | undefined>) => {
    button.value?.classList.add('active');
    setTimeout(() => button.value?.classList.remove('active'), 80);
};

const rewindZero = () => enableSimulationMode().rewindToFirstMove();
const backward = () => enableSimulationMode().rewind(1);
const forward = () => enableSimulationMode().forward(1);
const rewindCurrent = () => enableSimulationMode().resetSimulationAndRewind();
const rewindClose = () => disableSimulationMode();

const onKeyPress = (eventKey: string, callback: () => void): () => void => {
    const cb = (event: KeyboardEvent) => {
        // Ignore when in another mode,
        // to prevent switching to simulation mode when I was in conditional moves mode
        if (gameUIMode.value !== 'play' && gameUIMode.value !== 'simulation') {
            return;
        }

        // Ignore when I am writing in an input or textarea
        // to prevent indesirable trigger
        if ((event.target as HTMLElement | null)?.nodeName === 'INPUT') {
            return;
        }

        if (event.key === eventKey) {
            callback();
        }
    };

    window.addEventListener('keydown', cb);

    return () => {
        window.removeEventListener('keydown', cb);
    };
};

const unlisten: (() => void)[] = [
    onKeyPress('ArrowLeft', () => {
        backward();
        blinkButton(btnRewindBack);
    }),

    onKeyPress('ArrowRight', () => {
        forward();
        blinkButton(btnRewindForward);
    }),
];

onUnmounted(() => {
    for (const cb of unlisten) {
        cb();
    }
});
</script>

<template>
    <div class="app-board" :class="{ 'has-rewind-controls': gameUIMode !== 'play' }">
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
                    <span v-if="game.getWinner() === 0">&nbsp;<IconTrophyFill class="text-warning" /></span>
                </p>
                <AppChrono
                    v-if="timeControlOptions && timeControlValues"
                    :timeControlOptions="timeControlOptions"
                    :playerTimeData="timeControlValues.players[0]"
                    class="my-1"
                />
            </div>
            <div class="player player-b">
                <p class="h5" v-if="players">
                    <span v-if="game.getWinner() === 1"><IconTrophyFill class="text-warning" />&nbsp;</span>
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
                    class="my-1"
                />
            </div>
        </div>
        <p v-else>{{ $t('initializing_game') }}</p>

        <div class="rewind-controls" v-if="gameUIMode === 'simulation'">
            <!-- backward initial -->
            <button type="button" @click="rewindZero()" class="btn btn-outline-primary">
                <IconChevronBarLeft />
            </button>

            <!-- backward -->
            <button type="button" @click="backward()" class="btn btn-outline-primary" ref="btnRewindBack">
                <IconChevronLeft />
            </button>

            <!-- forward -->
            <button type="button" @click="forward()" class="btn btn-outline-primary" ref="btnRewindForward">
                <IconChevronRight />
            </button>

            <!-- forward max -->
            <button type="button" @click="rewindCurrent()" class="btn btn-outline-primary">
                <IconChevronBarRight />
            </button>

            <!-- Close rewind -->
            <button type="button" @click="rewindClose()" class="btn btn-outline-danger">
                <IconX />
            </button>
        </div>

        <div class="rewind-controls" v-else-if="conditionalMovesEditor && gameUIMode === 'conditional_moves'">

            <!-- Back to original position -->
            <button type="button" @click="conditionalMovesEditor.startNewLine()" class="btn btn-outline-primary">
                <IconCrosshair />
            </button>

            <!-- backward -->
            <button type="button" @click="conditionalMovesEditor.back()" class="btn btn-outline-primary">
                <IconChevronLeft />
            </button>

            <!-- Cut move -->
            <button type="button" @click="conditionalMovesEditor.cutMove()" class="btn btn-outline-danger" :disabled="0 === conditionalMovesEditor.getSelectedLine().length">
                <IconScissors />
            </button>

            <!-- Save -->
            <button type="button" @click="conditionalMovesEditor.submitConditionalMoves()" class="btn" :class="conditionalMovesEditor.getHasChanges() ? 'btn-success' : 'btn-outline-success'">
                <IconCheck /> {{ $t('save') }}
            </button>

            <!-- Close conditional moves edition -->
            <button type="button" @click="stopConditionalMoves()" class="btn btn-outline-warning">
                <IconX />
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
