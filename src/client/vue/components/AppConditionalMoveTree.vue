<script setup lang="ts">
import { PropType } from 'vue';
import { ConditionalMovesLine, ConditionalMovesTree } from '../../../shared/app/models/ConditionalMoves.js';
import { toRefs } from 'vue';
import AppConditionalMoveButton from './AppConditionalMoveButton.vue';

const props = defineProps({
    tree: {
        type: Array as PropType<ConditionalMovesTree>,
        required: true,
    },
    selectedLine: {
        type: Array as PropType<string[]>,
        required: false,
        default: null,
    },
    playerIndex: {
        type: Number,
        required: false,
        default: 0,
    },
    theme: {
        type: String as PropType<'inactive'>,
        required: false,
        default: 'hexagons',
    },
});

const { selectedLine } = toRefs(props);

const isSelectedMove = (currentLine: ConditionalMovesLine): boolean => {
    if (null === selectedLine.value) {
        return false;
    }

    return selectedLine.value[0] === currentLine[0];
};

const isSelectedAnswer = (currentLine: ConditionalMovesLine): boolean => {
    if (!isSelectedMove(currentLine)) {
        return false;
    }

    if (selectedLine.value.length < 2 || currentLine.length < 2) {
        return false;
    }

    return selectedLine.value[1] === currentLine[1];
};

const subLine = (currentLine: ConditionalMovesLine): null | string[] => {
    if (!isSelectedAnswer(currentLine)) {
        return null;
    }

    return selectedLine.value.slice(2) ?? null;
};

const buildLine = (move: string, answer?: string, next?: string[]): string[] => {
    const line = [move];

    if (undefined !== answer) {
        line.push(answer);

        if (undefined !== next) {
            line.push(...next);
        }
    }

    return line;
};

const emit = defineEmits<{
    (e: 'lineClicked', lineClicked: string[]): void;
}>();
</script>

<template>
    <ul
        v-for="line, key in tree"
        :key
        class="list-inline"
    >
        <li class="list-inline-item" :class="{ 'selected': isSelectedMove(line) }" @click="emit('lineClicked', buildLine(line[0]))">
            <AppConditionalMoveButton
                :theme
                :playerIndex="1 - playerIndex"
                :label="line[0]"
            />
        </li>
        <li class="list-inline-item" :class="{ 'selected': isSelectedAnswer(line) }" @click="emit('lineClicked', buildLine(line[0], line[1]))">
            <AppConditionalMoveButton
                :theme
                :playerIndex="playerIndex"
                :label="line[1] ?? '…'"
            />
        </li>
        <li v-if="line[2]" class="list-inline-item">
            <AppConditionalMoveTree
                :playerIndex
                :tree="line[2]"
                :theme
                :selectedLine="subLine(line) ?? undefined"
                @lineClicked="lineClicked => emit('lineClicked', buildLine(line[0], line[1], lineClicked))"
            />
        </li>
    </ul>
</template>

<style lang="stylus" scoped>
ul
    margin-bottom 0

    li.list-inline-item
        vertical-align top
        margin-right 0

    .selected
        background-color rgba(127, 127, 127, 0.2)
</style>
