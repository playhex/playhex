<script setup lang="ts">
import { useOverlayMeta } from 'unoverlay-vue';
import { ref } from 'vue';
import { sanitizeGameOptions } from '@shared/app/GameOptions';
import { BOARD_DEFAULT_SIZE, PlayerIndex } from '@shared/game-engine';
const { confirm, cancel } = useOverlayMeta();

let boardsize = ref(BOARD_DEFAULT_SIZE);
let boardsizeCustom = ref(false);

let firstPlayer = ref<null | PlayerIndex>(null);
</script>

<template>
    <div>
        <div class="modal d-block">
            <div class="modal-dialog">
                <form class="modal-content" @submit="confirm(sanitizeGameOptions({ boardsize, firstPlayer }))">
                    <div class="modal-header">
                        <h5 class="modal-title">Game options</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <p class="form-label">Board size</p>

                            <div class="btn-group" role="group">
                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="boardsize" :value="9" id="size-9">
                                <label class="btn btn-outline-primary" for="size-9">9</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="boardsize" :value="11" id="size-11">
                                <label class="btn btn-outline-primary" for="size-11">11</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="boardsize" :value="13" id="size-13">
                                <label class="btn btn-outline-primary" for="size-13">13</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="boardsize" :value="15" id="size-15">
                                <label class="btn btn-outline-primary" for="size-15">15</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" v-model="boardsize" :value="19" id="size-19">
                                <label class="btn btn-outline-primary" for="size-19">19</label>

                                <input type="radio" name="boardsize-radio" class="btn-check" @click="boardsizeCustom = true" id="size-custom">
                                <label class="btn btn-outline-primary" for="size-custom">Custom</label>
                            </div>
                        </div>

                        <div v-if="boardsizeCustom" class="mb-3">
                            <input
                                v-model="boardsize"
                                type="number"
                                min="1"
                                max="25"
                                class="form-control"
                            >
                        </div>

                        <div class="mb-3">
                            <p class="form-label">First player</p>

                            <div class="btn-group" role="group">
                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="firstPlayer" :value="null" id="first-random">
                                <label class="btn btn-outline-primary" for="first-random">Random</label>

                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="firstPlayer" :value="0" id="first-0">
                                <label class="btn btn-outline-primary text-player-a" for="first-0">Me</label>

                                <input type="radio" name="firstPlayer-radio" class="btn-check" v-model="firstPlayer" :value="1" id="first-1">
                                <label class="btn btn-outline-primary text-player-b" for="first-1">Opponent</label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="cancel()">Cancel</button>
                        <button type="submit" class="btn btn-success">Create game</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
