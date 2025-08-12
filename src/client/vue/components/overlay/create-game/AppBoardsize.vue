<script lang="ts" setup>
import { PropType, Ref, ref, toRefs } from 'vue';
import { BIconAspectRatio } from '../../../icons';
import { MIN_BOARDSIZE, MAX_BOARDSIZE } from '../../../../../shared/app/models/HostedGameOptions.js';

const boardsize = defineModel<number>({
    required: true,
});

const props = defineProps({
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

const { boardsizeMin, boardsizeMax, sizesSelection } = toRefs(props);

const showCustomBoardsize: Ref<boolean> = ref(!sizesSelection.value.includes(boardsize.value));

const isBoardsizeAllowed = (boardsize: number): boolean => {
    if (typeof boardsizeMin?.value === 'number' && boardsize < boardsizeMin.value) {
        return false;
    }

    if (typeof boardsizeMax?.value === 'number' && boardsize > boardsizeMax.value) {
        return false;
    }

    return true;
};
</script>

<template>
    <h6><BIconAspectRatio class="me-1" /> {{ $t('game.board_size') }}</h6>

    <div class="btn-group" role="group">
        <template v-for="size in sizesSelection" :key="size">
            <input type="radio" name="boardsize-radio" class="btn-check" v-model="boardsize" :value="size" :id="'size-' + size" :disabled="!isBoardsizeAllowed(size)">
            <label class="btn" :class="isBoardsizeAllowed(size) ? 'btn-outline-primary' : 'btn-outline-secondary'" :for="'size-' + size">{{ size }}</label>
        </template>

        <input type="radio" name="boardsize-radio" class="btn-check" @click="showCustomBoardsize = true" id="size-custom">
        <label class="btn btn-outline-primary" for="size-custom">{{ $t('create_game.custom_size') }}</label>
    </div>

    <div v-if="showCustomBoardsize" class="mt-3">
        <input
            v-model="boardsize"
            type="number"
            :min="boardsizeMin ?? MIN_BOARDSIZE"
            :max="boardsizeMax ?? MAX_BOARDSIZE"
            class="form-control"
        >
    </div>
</template>
