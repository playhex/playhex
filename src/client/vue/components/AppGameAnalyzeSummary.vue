<script lang="ts" setup>
/* eslint-env browser */
import { GameAnalyzeData } from '@shared/app/models/GameAnalyze';
import { PropType } from 'vue';

const props = defineProps({
    analyze: {
        type: Object as PropType<GameAnalyzeData>,
        required: true,
    },
});

const moveClass = (whiteWin: null | number): string => {
    if (null === whiteWin) {
        return '';
    }

    const { round, abs } = Math;
    const opacity = round(abs(whiteWin - 0.5) * 8) * 25;
    const color = whiteWin > 0.5 ? 'white' : 'black';

    return color + ' opacity-' + opacity;
};
</script>

<template>
    <div class="analyze">
        <div
            v-for="move, key in props.analyze"
            :key
            class="move"
            :class="moveClass(move?.move.whiteWin ?? null)"
        ></div>
    </div>
</template>

<style lang="stylus" scoped>
.analyze
    display flex
    height 1.25em
    padding 0.25em 0

    .move
        flex-grow 1

        &.black
            background-color var(--bs-red)

        &.white
            background-color var(--bs-blue)
</style>
