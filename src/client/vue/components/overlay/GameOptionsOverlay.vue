<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType, Ref, ref } from 'vue';
import { GameOptionsData, sanitizeGameOptions } from '@shared/app/GameOptions';
import { defaultGameOptions } from '@shared/app/GameOptions';
import TimeControlType from '@shared/time-control/TimeControlType';
import { BIconAspectRatio, BIconHourglass, BIconCaretDownFill, BIconCaretRight } from 'bootstrap-icons-vue';

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

const initialTimeSteps: { seconds: number, label: string }[] = [
    { seconds: 5, label: '5s' },
    { seconds: 10, label: '10s' },
    { seconds: 15, label: '15s' },
    { seconds: 30, label: '30s' },
    { seconds: 45, label: '45s' },
    { seconds: 60, label: '1min' },
    { seconds: 90, label: '1min30s' },
    { seconds: 60 * 2, label: '2min' },
    { seconds: 60 * 3, label: '3min' },
    { seconds: 60 * 4, label: '4min' },
    { seconds: 60 * 5, label: '5min' },
    { seconds: 60 * 7, label: '7min' },
    { seconds: 60 * 10, label: '10min' },
    { seconds: 60 * 12, label: '12min' },
    { seconds: 60 * 15, label: '15min' },
    { seconds: 60 * 20, label: '20min' },
    { seconds: 60 * 25, label: '25min' },
    { seconds: 60 * 30, label: '30min' },
    { seconds: 60 * 40, label: '40min' },
    { seconds: 60 * 45, label: '45min' },
    { seconds: 60 * 60, label: '1h' },
    { seconds: 60 * 75, label: '1h15' },
    { seconds: 60 * 90, label: '1h30' },
    { seconds: 60 * 120, label: '2h' },
    { seconds: 60 * 150, label: '2h30' },
    { seconds: 60 * 180, label: '3h' },
];

const secondaryTimeSteps: { seconds: number, label: string }[] = [
    { seconds: 0, label: 'none' },
    { seconds: 1, label: '1s' },
    { seconds: 2, label: '2s' },
    { seconds: 3, label: '3s' },
    { seconds: 4, label: '4s' },
    { seconds: 5, label: '5s' },
    { seconds: 6, label: '6s' },
    { seconds: 7, label: '7s' },
    { seconds: 8, label: '8s' },
    { seconds: 9, label: '9s' },
    { seconds: 10, label: '10s' },
    { seconds: 12, label: '12s' },
    { seconds: 15, label: '15s' },
    { seconds: 20, label: '20s' },
    { seconds: 25, label: '25s' },
    { seconds: 30, label: '30s' },
    { seconds: 40, label: '40s' },
    { seconds: 45, label: '45s' },
    { seconds: 60, label: '1min' },
    { seconds: 75, label: '1min15s' },
    { seconds: 90, label: '1min30s' },
    { seconds: 120, label: '2min' },
    { seconds: 150, label: '2min30' },
    { seconds: 180, label: '3min' },
];

const initialTimeSelected = ref(Object.values(initialTimeSteps).findIndex(t => t.seconds === 60 * 10));
const secondaryTimeIncrementSelected = ref(Object.values(secondaryTimeSteps).findIndex(t => t.seconds === 5));
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
            gameOptions.timeControl.options.initialSeconds = initialTimeSteps[initialTimeSelected.value].seconds;
            gameOptions.timeControl.options.incrementSeconds = secondaryTimeSteps[secondaryTimeIncrementSelected.value].seconds;
        }

        if ('byoyomi' === gameOptions.timeControl.type) {
            gameOptions.timeControl.options.initialSeconds = initialTimeSteps[initialTimeSelected.value].seconds;
            gameOptions.timeControl.options.periodSeconds = secondaryTimeSteps[secondaryTimeIncrementSelected.value].seconds;
            gameOptions.timeControl.options.periodsCount = byoyomiPeriodsCount.value;
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
                                max="42"
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
                                <label for="custom-fischer-initial-time" class="form-label">Initial time: {{ initialTimeSteps[initialTimeSelected].label }}</label>
                                <input type="range" class="form-range" id="custom-fischer-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

                                <label for="custom-fischer-time-increment" class="form-label">Time increment: {{ secondaryTimeSteps[secondaryTimeIncrementSelected].label }}</label>
                                <input type="range" class="form-range" id="custom-fischer-time-increment" v-model="secondaryTimeIncrementSelected" min="0" :max="Object.keys(secondaryTimeSteps).length - 1" step="1">
                            </div>
                            <div v-if="'byoyomi' === gameOptions.timeControl.type">
                                <label for="custom-byoyomi-initial-time" class="form-label">Initial time: {{ initialTimeSteps[initialTimeSelected].label }}</label>
                                <input type="range" class="form-range" id="custom-byoyomi-initial-time" v-model="initialTimeSelected" min="0" :max="Object.keys(initialTimeSteps).length - 1" step="1">

                                <label for="custom-byoyomi-perdiod-time" class="form-label">Period time: {{ secondaryTimeSteps[secondaryTimeIncrementSelected].label }}</label>
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
