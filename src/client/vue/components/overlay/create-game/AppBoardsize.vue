<script lang="ts" setup>
import { PropType, Ref, ref, toRefs } from 'vue';
import { BIconAspectRatio } from 'bootstrap-icons-vue';
import HostedGameOptions, { MAX_BOARDSIZE } from '../../../../../shared/app/models/HostedGameOptions.js';

const props = defineProps({
    gameOptions: {
        type: Object as PropType<HostedGameOptions>,
        required: true,
    },
    boardsizeMin: {
        type: Number,
        required: false,
        default: undefined,
    },
    boardsizeMax: {
        type: Number,
        required: false,
        default: undefined,
    },
    sizesSelection: {
        type: Array as PropType<number[]>,
        required: false,
        default: () => [9, 11, 13, 14, 19],
    },
});

const { gameOptions, boardsizeMin, boardsizeMax, sizesSelection } = toRefs(props);

const showCustomBoardsize: Ref<boolean> = ref(!sizesSelection.value.includes(gameOptions.value.boardsize));

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
    <h6><BIconAspectRatio /> {{ $t('game.board_size') }}</h6>

    <div class="btn-group" role="group">
        <template v-for="size in sizesSelection" :key="size">
            <input type="radio" name="boardsize-radio" class="btn-check" v-model="gameOptions.boardsize" :value="size" :id="'size-' + size" :disabled="!isBoardsizeAllowed(size)">
            <label class="btn btn-outline-primary" :class="isBoardsizeAllowed(size) ? 'btn-outline-primary' : 'btn-outline-secondary'" :for="'size-' + size">{{ size }}</label>
        </template>

        <input type="radio" name="boardsize-radio" class="btn-check" @click="showCustomBoardsize = true" id="size-custom">
        <label class="btn btn-outline-primary" for="size-custom">{{ $t('create_game.custom_size') }}</label>
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
