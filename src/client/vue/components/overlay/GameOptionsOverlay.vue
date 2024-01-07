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
            maxSeconds: 300,
        },
    },
    'Normal 10&nbsp;+&nbsp;5': {
        type: 'fischer',
        options: {
            initialSeconds: 600,
            incrementSeconds: 5,
            maxSeconds: 600,
        },
    },
};

// Must be different that predefined ones,
// or "Custom" will be select first on Game option popin open
const customTimeControl: Ref<TimeControlType> = ref({
    type: 'byoyomi',
    options: {
        initialSeconds: 300,
        periodSeconds: 10,
        periodsCount: 5,

        incrementSeconds: 5,
        maxSeconds: 300,

        secondsPerMove: 20,

        secondsPerPlayer: 600,
    },
});

const showCustomTimeControl = ref(false);
const timeControlTypes: { type: TimeControlType['type'], label: string }[] = [
    { type: 'simple', label: 'Simple' },
    { type: 'absolute', label: 'Absolute' },
    { type: 'fischer', label: 'Fischer' },
    { type: 'byoyomi', label: 'Byo Yomi' },
];

const preSelectedTimeControl = Object.values(defaultTimeControls).pop();

if (!preSelectedTimeControl) {
    throw new Error('No time control');
}

gameOptions.value.timeControl = preSelectedTimeControl;
/*
 * Secondary options
 */
const showSecondaryOptions = ref(false);
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit="e => {e.preventDefault(); confirm(sanitizeGameOptions(gameOptions))}">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ title }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <h6><b-icon-aspect-ratio /> Board size</h6>

                            <div class="btn-group" role="group">
                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="9" id="size-9">
                                <label class="btn btn-outline-primary" for="size-9">9</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="11" id="size-11">
                                <label class="btn btn-outline-primary" for="size-11">11</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="13" id="size-13">
                                <label class="btn btn-outline-primary" for="size-13">13</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="14" id="size-14">
                                <label class="btn btn-outline-primary" for="size-14">14</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="19" id="size-19">
                                <label class="btn btn-outline-primary" for="size-19">19</label>

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

                        <div v-if="showCustomTimeControl" class="mb-3">
                            <select v-model="customTimeControl.type" class="form-select">
                                <option
                                    v-for="timeControlType in timeControlTypes"
                                    :value="timeControlType.type"
                                >{{ timeControlType.label }}</option>
                            </select>
                        </div>

                        <div v-if="showCustomTimeControl && customTimeControl.type === 'simple'">
                            <p class="mb-3">Players have a same time for every move.</p>
                            <div class="mb-3">
                                <label for="simple-time" class="form-label">Seconds per move</label>
                                <input
                                    v-model="customTimeControl.options.secondsPerMove"
                                    type="number"
                                    class="form-control"
                                    id="simple-time"
                                    min="10"
                                    max="7200"
                                >
                            </div>
                        </div>

                        <div v-if="showCustomTimeControl && customTimeControl.type === 'absolute'">
                            <p class="mb-3">Players have a total time for the whole game.</p>
                            <div class="mb-3">
                                <label for="absolute-total-time" class="form-label">Total seconds per player</label>
                                <input
                                    v-model="customTimeControl.options.secondsPerPlayer"
                                    type="number"
                                    class="form-control"
                                    id="absolute-total-time"
                                    min="10"
                                    max="7200"
                                >
                            </div>
                        </div>

                        <div v-if="showCustomTimeControl && customTimeControl.type === 'fischer'">
                            <p class="mb-3">
                                Time control with an initial time for the whole game,
                                and a time increment on every move played.
                                Total time can me maxed to a given value.
                            </p>
                            <div class="mb-3">
                                <label for="fischer-initial" class="form-label">Initial seconds per player</label>
                                <input
                                    v-model="customTimeControl.options.initialSeconds"
                                    type="number"
                                    class="form-control"
                                    id="fischer-initial"
                                    min="10"
                                    max="7200"
                                >
                            </div>
                            <div class="mb-3">
                                <label for="fischer-increment" class="form-label">Seconds increment per move</label>
                                <input
                                    v-model="customTimeControl.options.incrementSeconds"
                                    type="number"
                                    class="form-control"
                                    id="fischer-increment"
                                    min="0"
                                    max="120"
                                >
                            </div>
                            <div class="mb-3">
                                <label for="fischer-max" class="form-label">Max seconds</label>
                                <input
                                    v-model="customTimeControl.options.maxSeconds"
                                    type="number"
                                    class="form-control"
                                    id="fischer-max"
                                    min="0"
                                    max="7200"
                                >
                            </div>
                        </div>

                        <div v-if="showCustomTimeControl && customTimeControl.type === 'byoyomi'">
                            <p class="mb-3">
                                Time control with an initial time, and then a fixed amound of time for every move.
                                This last amount of time can be elapsed a few time.
                            </p>
                            <div class="mb-3">
                                <label for="byoyomi-initial" class="form-label">Initial seconds per player</label>
                                <input
                                    v-model="customTimeControl.options.initialSeconds"
                                    type="number"
                                    class="form-control"
                                    id="byoyomi-initial"
                                    min="1"
                                    max="7200"
                                >
                            </div>
                            <div class="mb-3">
                                <label for="byoyomi-increment" class="form-label">Seconds of periods after initial time</label>
                                <input
                                    v-model="customTimeControl.options.periodSeconds"
                                    type="number"
                                    class="form-control"
                                    id="byoyomi-periods-time"
                                    min="1"
                                    max="120"
                                >
                            </div>
                            <div class="mb-3">
                                <label for="byoyomi-max" class="form-label">Number of periods</label>
                                <input
                                    v-model="customTimeControl.options.periodsCount"
                                    type="number"
                                    class="form-control"
                                    id="byoyomi-periods-count"
                                    min="1"
                                    max="50"
                                >
                            </div>
                        </div>

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
</style>
