<script setup lang="ts">
import { IconCheck, IconScissors, IconTrash } from '../icons.js';
import AppConditionalMoveTree from './AppConditionalMoveTree.vue';
import AppConditionalMoveButton from './AppConditionalMoveButton.vue';
import { storeToRefs } from 'pinia';
import useCurrentGameStore from '../../stores/currentGameStore.js';

const {
    conditionalMovesEditor,
    conditionalMovesState,
    gameUIMode,
} = storeToRefs(useCurrentGameStore());

const {
    stopConditionalMoves,
} = useCurrentGameStore();
</script>

<template>
    <template v-if="conditionalMovesEditor && conditionalMovesState">
        <div v-if="conditionalMovesState.conditionalMovesDirty.tree.length > 0" class="conditional-move-tree-container">
            <AppConditionalMoveTree
                :tree="conditionalMovesState.conditionalMovesDirty.tree"
                :selectedLine="conditionalMovesState.selectedLine"
                :playerIndex="conditionalMovesState.myIndex"
                @lineClicked="lineClicked => conditionalMovesEditor?.setSelectedLine(lineClicked)"
            />
        </div>

        <AppConditionalMoveButton
            label="+"
            :playerIndex="1 - conditionalMovesState.myIndex"
            @click="conditionalMovesEditor.startNewLine()"
            aria-label="Add new conditional move"
        />

        <button
            v-if="gameUIMode === 'conditional_moves'"
            @click="conditionalMovesEditor.submitConditionalMoves()"
            class="btn me-2"
            :class="conditionalMovesEditor.getHasChanges() ? 'btn-success' : 'btn-outline-success'"
        ><IconCheck /> {{ $t('save') }}</button>

        <button
            v-if="gameUIMode === 'conditional_moves'"
            @click="stopConditionalMoves()"
            class="btn"
            :class="conditionalMovesEditor.getHasChanges() ? 'btn-warning' : 'btn-outline-warning'"
        >{{ conditionalMovesEditor.getHasChanges() ? $t('discard') : $t('close') }}</button>

        <button
            v-if="conditionalMovesState.selectedLine.length > 0"
            @click="conditionalMovesEditor.cutMove()"
            class="btn btn-sm btn-outline-danger ms-2"
        ><IconScissors /> {{ $t('conditional_moves.cut_move') }}</button>

        <div v-if="conditionalMovesState.conditionalMovesDirty.unplayedLines.length > 0" class="conditional-move-tree-container">
            <h4>{{ $t('conditional_moves.inactive_lines') }}</h4>

            <button
                @click="conditionalMovesEditor.deleteAllInactives()"
                class="btn btn-sm btn-outline-danger ms-2"
            ><IconTrash /> {{ $t('conditional_moves.clear_inactive_lines') }}</button>

            <AppConditionalMoveTree
                theme="inactive"
                :tree="conditionalMovesState.conditionalMovesDirty.unplayedLines"
                :playerIndex="conditionalMovesState.myIndex"
                @lineClicked="lineClicked => conditionalMovesEditor?.setSelectedLine(lineClicked)"
            />
        </div>
    </template>

    <p v-else>{{ $t('loading') }}</p>
</template>

<style lang="stylus" scoped>
.conditional-move-tree-container
    overflow-x auto
    overflow-y hidden
    white-space nowrap
    padding-bottom 0.5em
</style>
