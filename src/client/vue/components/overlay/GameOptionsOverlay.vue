<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType, Ref, ref } from 'vue';
import { GameOptionsData, sanitizeGameOptions } from '@shared/app/GameOptions';
import { defaultGameOptions } from '@shared/app/GameOptions';
import TimeControlType from '@shared/time-control/TimeControlType';
import { BIconAspectRatio, BIconHourglass, BIconCaretDownFill, BIconCaretRight } from 'bootstrap-icons-vue';
import { secondsToDuration } from '@shared/app/timeControlUtils';
import { MAX_BOARDSIZE } from '../../../../shared/app/GameOptions';

const { visible, confirm, cancel } = useOverlayMeta();

const props = defineProps({
    gameOptions: {
        type: Object as PropType<Partial<GameOptionsData>>,
        required: true,
    },
});

export type GameOptionsOverlayInput = typeof props;

const gameOptions = ref<GameOptionsData>({ ...defaultGameOptions, ...props.gameOptions });
const title = 'Game options';
const confirmLabel = {
    ai: 'Play vs AI',
    player: 'Create 1v1',
    local_ai: 'Play offline vs AI',
}[gameOptions.value.opponent.type];

/*
 * Board size
 */
const showCustomBoardsize = ref(false);

/*
 * Time control
 */
const defaultTimeControls: { [key: string]: TimeControlType } = {
    'Fast 5&nbsp;+&nbsp;2': {
        type: 'fischer',
        options: {
            initialSeconds: 300,
            incrementSeconds: 2,
        },
    },
    'Normal 10&nbsp;+&nbsp;5': {
        type: 'fischer',
        options: {
            initialSeconds: 600,
            incrementSeconds: 5,
        },
    },
    'Long 30&nbsp;+&nbsp;15': {
        type: 'fischer',
        options: {
            initialSeconds: 1800,
            incrementSeconds: 15,
        },
    },
};

// Must be different that predefined ones,
// or "Custom" will be select first on Game option popin open
const customTimeControl: Ref<TimeControlType> = ref({
    type: 'fischer',
    options: {
        initialSeconds: 480,
        incrementSeconds: 5,
    },
});

const showCustomTimeControl = ref(false);

const initialTimeSteps: number[] = [
    5,
    10,
    15,
    30,
    45,
    60,
    90,
    60 * 2,
    60 * 3,
    60 * 4,
    60 * 5,
    60 * 7,
    60 * 10,
    60 * 12,
    60 * 15,
    60 * 20,
    60 * 25,
    60 * 30,
    60 * 40,
    60 * 45,
    60 * 60,
    60 * 75,
    60 * 90,
    60 * 120,
    60 * 150,
    60 * 180,
    86400 * 1,
    86400 * 3,
    86400 * 7,
    86400 * 14,
];

const secondaryTimeSteps: number[] = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    12,
    15,
    20,
    25,
    30,
    40,
    45,
    60,
    75,
    90,
    120,
    150,
    180,
    3600 * 4,
    3600 * 8,
    3600 * 12,
    86400 * 1,
    86400 * 2,
    86400 * 3,
    86400 * 5,
    86400 * 7,
    86400 * 10,
    86400 * 14,
];

const initialTimeSelected = ref(Object.values(initialTimeSteps).findIndex(t => t === 60 * 10));
const secondaryTimeIncrementSelected = ref(Object.values(secondaryTimeSteps).findIndex(t => t === 5));
const byoyomiPeriodsCount = ref(5);

gameOptions.value.timeControl = defaultTimeControls['Normal 10&nbsp;+&nbsp;5'];

/*
 * Secondary options
 */
const showSecondaryOptions = ref(false);

/*
 * Set data before sumbit form
 */
const submitForm = (gameOptions: GameOptionsData): void => {
    if (showCustomTimeControl.value) {
        if ('fischer' === gameOptions.timeControl.type) {
            gameOptions.timeControl.options.initialSeconds = initialTimeSteps[initialTimeSelected.value];
            gameOptions.timeControl.options.incrementSeconds = secondaryTimeSteps[secondaryTimeIncrementSelected.value];
        }

        if ('byoyomi' === gameOptions.timeControl.type) {
            gameOptions.timeControl.options.initialSeconds = initialTimeSteps[initialTimeSelected.value];
            gameOptions.timeControl.options.periodSeconds = secondaryTimeSteps[secondaryTimeIncrementSelected.value];
            gameOptions.timeControl.options.periodsCount = Number(byoyomiPeriodsCount.value);
        }
    }

    if ('fischer' === gameOptions.timeControl.type) {
        gameOptions.timeControl.options.maxSeconds = gameOptions.timeControl.options.initialSeconds;
    }

    confirm(sanitizeGameOptions(gameOptions));
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit="e => { e.preventDefault(); submitForm(gameOptions); }">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ title }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <h6><b-icon-aspect-ratio /> Board size</h6>

                            <div class="btn-group" role="group">
                                <template v-for="size in [9, 11, 13, 14, 19]" :key="size">
                                    <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="size" :id="'size-' + size">
                                    <label class="btn btn-outline-primary" :for="'size-' + size">{{ size }}</label>
                                </template>

                                <input type="radio" name="boardsize-radio" class="btn-check" @click="showCustomBoardsize = true" id="size-custom">
                                <label class="btn btn-outline-primary" for="size-custom">Custom</label>
                            </div>
                        </div>

                        <div v-if="showCustomBoardsize" class="mb-3">
                            <input
                                v-model="gameOptions.boardsize"
                                type="number"
                                min="1"
                                :max="MAX_BOARDSIZE"
                                class="form-control"
                            >
                        </div>

                        <div class="mb-3">
                            <h6><b-icon-hourglass /> Time control</h6>

                            <div class="btn-group" role="group">
                                <template v-for="(timeControl, label) in defaultTimeControls" :key="label">
                                    <input
                                        type="radio"
                                        name="time-control"
                                        class="btn-check"
                                        v-model="gameOptions.timeControl"
                                        :value="timeControl"
                                        @click="showCustomTimeControl = false"
                                        :id="'choice-' + label"
                                    >
                                    <label
                                        class="btn btn-outline-primary"
                                        :for="'choice-' + label"
                                        v-html="label"
                                    ></label>
                                </template>

                                <input type="radio" name="time-control" class="btn-check" v-model="gameOptions.timeControl" :value="customTimeControl" @click="showCustomTimeControl = true" id="time-control-custom">
                                <label class="btn btn-outline-primary" for="time-control-custom">Custom</label>
                            </div>
                        </div>

                        <template v-if="showCustomTimeControl">
                            <div v-if="'fischer' === gameOptions.timeControl.type">
                                <strong class="min-w">Fischer</strong>
                                <button type="button" @click="() => gameOptions.timeControl.type = 'byoyomi'" class="btn btn-sm btn-link">Use Byo-Yomi</button>
                            </div>
                            <div v-else>
                                <strong class="min-w">Byo Yomi</strong>
                                <button type="button" @click="() => gameOptions.timeControl.type = 'fischer'" class="btn btn-sm btn-link">Use Fischer</button>
                            </div>

                            <div v-if="'fischer' === gameOptions.timeControl.type">
                                <label for="custom-fischer-initial-time" class="form-label">Initial time: {{ secondsToDuration(initialTimeSteps[initialTimeSelected]) }}</label>
                                <input type="range" class="form-range" id="custom-fischer-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

                                <label for="custom-fischer-time-increment" class="form-label">Time increment: {{ secondsToDuration(secondaryTimeSteps[secondaryTimeIncrementSelected]) }}</label>
                                <input type="range" class="form-range" id="custom-fischer-time-increment" v-model="secondaryTimeIncrementSelected" min="0" :max="Object.keys(secondaryTimeSteps).length - 1" step="1">
                            </div>
                            <div v-if="'byoyomi' === gameOptions.timeControl.type">
                                <label for="custom-byoyomi-initial-time" class="form-label">Initial time: {{ secondsToDuration(initialTimeSteps[initialTimeSelected]) }}</label>
                                <input type="range" class="form-range" id="custom-byoyomi-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

                                <label for="custom-byoyomi-perdiod-time" class="form-label">Period time: {{ secondsToDuration(secondaryTimeSteps[secondaryTimeIncrementSelected]) }}</label>
                                <input type="range" class="form-range" id="custom-byoyomi-perdiod-time" v-model="secondaryTimeIncrementSelected" min="0" :max="Object.keys(secondaryTimeSteps).length - 1" step="1">

                                <label for="custom-byoyomi-period-count" class="form-label">Periods count: {{ byoyomiPeriodsCount }}</label>
                                <input type="range" class="form-range" id="custom-byoyomi-period-count" v-model="byoyomiPeriodsCount" min="0" max="15" step="1">
                            </div>
                        </template>

                        <button
                            v-if="showSecondaryOptions"
                            @click="showSecondaryOptions = false"
                            type="button"
                            class="btn btn-primary btn-sm mt-3"
                        ><b-icon-caret-down-fill /> Less options</button>
                        <button
                            v-else
                            @click="showSecondaryOptions = true"
                            type="button"
                            class="btn btn-outline-primary btn-sm mt-3"
                        ><b-icon-caret-right /> More options</button>
                    </div>
                    <div v-if="showSecondaryOptions" class="modal-body border-top">
                        <div class="mb-3">
                            <h6>I play</h6>

                            <div class="btn-group btn-group-min-width" role="group">
                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="null" id="first-random">
                                <label class="btn btn-outline-secondary" for="first-random">Random</label>

                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="0" id="first-0">
                                <label class="btn btn-outline-danger" for="first-0">First</label>

                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="1" id="first-1">
                                <label class="btn btn-outline-primary" for="first-1">Second</label>
                            </div>
                        </div>

                        <div class="mb-3">
                            <h6>Swap rule</h6>

                            <div class="form-check">
                                <input class="form-check-input" v-model="gameOptions.swapRule" type="checkbox" id="swap-rule">
                                <label class="form-check-label" for="swap-rule">
                                    Allow swap pieces
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">Cancel</button>
                        <button type="submit" class="btn btn-success">{{ confirmLabel }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>

<style lang="stylus" scoped>
.btn-group-min-width
    .btn
        min-width 6em

.min-w
    display inline-block
    min-width 6em
</style>
