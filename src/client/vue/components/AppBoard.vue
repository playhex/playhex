<script setup lang="ts">
/* eslint-env browser */
import GameView from '../../pixi-board/GameView';
import { onMounted, onUnmounted, ref } from 'vue';
import { PropType, toRefs } from 'vue';
import GameFinishedOverlay from './overlay/GameFinishedOverlay.vue';
import { createOverlay } from 'unoverlay-vue';
import AppChrono from './AppChrono.vue';
import AppPseudoWithOnlineStatus from './AppPseudoWithOnlineStatus.vue';
import Player from '../../../shared/app/models/Player';
import TimeControlType from '../../../shared/time-control/TimeControlType';
import { GameTimeData } from '../../../shared/time-control/TimeControl';

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
    rematch: {
        type: Function,
        required: false,
        default: null,
    },
});

const { gameView } = props;
const { players, timeControlOptions, timeControlValues } = toRefs(props);

/*
 * Add piwi view
 */
const game = gameView.getGame();

if (!gameView || !game) {
    throw new Error('gameView is required');
}

onMounted(() => {
    if (!pixiApp.value) {
        throw new Error('No element with ref="pixiApp"');
    }

    if (!gameView) {
        throw new Error('gameView has no value');
    }

    pixiApp.value.appendChild(gameView.getView() as unknown as Node);
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
const gameFinishedOverlay = createOverlay(GameFinishedOverlay);
const { rematch } = props;

gameView.on('endedAndWinAnimationOver', () => {
    gameFinishedOverlay({
        game,
        players: players.value,
        rematch,
    });
});

onUnmounted(() => gameView.removeAllListeners('endedAndWinAnimationOver'));
</script>

<template>
    <div class="app-board">
        <div class="board-container">
            <div ref="pixiApp"></div>
        </div>

        <div v-if="game" :class="['game-info-overlay', `orientation-${orientation}`]">
            <div class="player player-a">
                <p class="h5" v-if="players">
                    <AppPseudoWithOnlineStatus
                        v-if="players[0]"
                        :player="players[0]"
                        classes="text-danger"
                    />
                    <span v-else class="fst-italic">{{ $t('waiting') }}</span>
                </p>
                <AppChrono
                    v-if="timeControlOptions && timeControlValues"
                    :timeControlOptions="timeControlOptions"
                    :playerTimeData="timeControlValues.players[0]"
                />
            </div>
            <div class="player player-b">
                <p class="h5" v-if="players">
                    <AppPseudoWithOnlineStatus
                        v-if="players[1]"
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
    </div>
</template>

<style scoped lang="stylus">
.app-board
    position relative

.board-container
    display flex
    justify-content center

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
</style>
