<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { PropType, ref } from 'vue';
import { GameOptionsData, sanitizeGameOptions } from '@shared/app/GameOptions';
import { defaultGameOptions } from '@shared/app/GameOptions';

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

const showCustomBoardsize = ref(false);
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
                            <p class="form-label">Board size</p>

                            <div class="btn-group" role="group">
                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="9" id="size-9">
                                <label class="btn btn-outline-primary" for="size-9">9</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="11" id="size-11">
                                <label class="btn btn-outline-primary" for="size-11">11</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="13" id="size-13">
                                <label class="btn btn-outline-primary" for="size-13">13</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="15" id="size-15">
                                <label class="btn btn-outline-primary" for="size-15">15</label>

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
                                max="25"
                                class="form-control"
                            >
                        </div>

                        <div class="mb-3">
                            <p class="form-label">First player</p>

                            <div class="btn-group btn-group-min-width" role="group">
                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="null" id="first-random">
                                <label class="btn btn-outline-secondary" for="first-random">Random</label>

                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="0" id="first-0">
                                <label class="btn btn-outline-danger" for="first-0">Me</label>

                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="gameOptions.firstPlayer" :value="1" id="first-1">
                                <label class="btn btn-outline-primary" for="first-1">Opponent</label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="cancel()">Cancel</button>
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
