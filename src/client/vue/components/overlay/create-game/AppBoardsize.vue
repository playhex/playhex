<script lang="ts" setup>
import { PropType, ref, toRefs } from 'vue';
import { BIconAspectRatio } from 'bootstrap-icons-vue';
import { GameOptionsData, MAX_BOARDSIZE } from '../../../../../shared/app/GameOptions';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<GameOptionsData>,
        required: true,
    },
    boardsizeMin: {
        type: Number,
        required: false,
    },
    boardsizeMax: {
        type: Number,
        required: false,
    },
});

const { gameOptions, boardsizeMin, boardsizeMax } = toRefs(props);

const showCustomBoardsize = ref(false);

const isBoardsizeAllowed = (boardsize: number): boolean => {
    if ('number' === typeof boardsizeMin?.value && boardsize < boardsizeMin.value) {
        return false;
    }

    if ('number' === typeof boardsizeMax?.value && boardsize > boardsizeMax.value) {
        return false;
    }

    return true;
};
</script>

<template>
    <h6><b-icon-aspect-ratio /> Board size</h6>

    <div class="btn-group" role="group">
        <template v-for="size in [9, 11, 13, 14, 19]" :key="size">
            <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="size" :id="'size-' + size" :disabled="!isBoardsizeAllowed(size)">
            <label class="btn btn-outline-primary" :class="isBoardsizeAllowed(size) ? 'btn-outline-primary' : 'btn-outline-secondary'" :for="'size-' + size">{{ size }}</label>
        </template>

        <input type="radio" name="boardsize-radio" class="btn-check" @click="showCustomBoardsize = true" id="size-custom">
        <label class="btn btn-outline-primary" for="size-custom">Custom</label>
    </div>


    <div v-if="showCustomBoardsize" class="mt-3">
        <input
            v-model="gameOptions.boardsize"
            type="number"
            :min="boardsizeMin ?? 1"
            :max="boardsizeMax ?? MAX_BOARDSIZE"
            class="form-control"
        >
    </div>
</template>
