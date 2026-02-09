<script setup lang="ts">
import { IconCheck, IconScissors, IconTrash } from '../icons.js';
import AppConditionalMoveTree from './AppConditionalMoveTree.vue';
import AppConditionalMoveButton from './AppConditionalMoveButton.vue';
import { storeToRefs } from 'pinia';
import useConditionalMovesStore from '../../stores/conditionalMovesStore.js';

const {
    conditionalMovesEditor,
    conditionalMovesEditorState,
    conditionalMovesEnabled,
} = storeToRefs(useConditionalMovesStore());
</script>

<template>
    <template v-if="conditionalMovesEditor && conditionalMovesEditorState">
        <div v-if="conditionalMovesEditorState.conditionalMovesDirty.tree.length > 0" class="conditional-move-tree-container">
            <AppConditionalMoveTree
                :tree="conditionalMovesEditorState.conditionalMovesDirty.tree"
                :selectedLine="conditionalMovesEditorState.selectedLine"
                :playerIndex="conditionalMovesEditorState.myIndex"
                @lineClicked="lineClicked => conditionalMovesEditor?.setSelectedLine(lineClicked)"
            />
        </div>

        <AppConditionalMoveButton
            label="+"
            :playerIndex="1 - conditionalMovesEditorState.myIndex"
            @click="conditionalMovesEditor.startNewLine()"
            aria-label="Add new conditional move"
        />

        <button
            v-if="conditionalMovesEnabled"
            @click="conditionalMovesEditor.submitConditionalMoves()"
            class="btn me-2"
            :class="conditionalMovesEditor.getHasChanges() ? 'btn-success' : 'btn-outline-success'"
        ><IconCheck /> {{ $t('save') }}</button>

        <button
            v-if="conditionalMovesEnabled"
            @click="conditionalMovesEditor.discardSimulationMoves(); conditionalMovesEnabled = false"
            class="btn"
            :class="conditionalMovesEditor.getHasChanges() ? 'btn-warning' : 'btn-outline-warning'"
        >{{ conditionalMovesEditor.getHasChanges() ? $t('discard') : $t('close') }}</button>

        <button
            v-if="conditionalMovesEditorState.selectedLine.length > 0"
            @click="conditionalMovesEditor.cutMove()"
            class="btn btn-sm btn-outline-danger ms-2"
        ><IconScissors /> {{ $t('conditional_moves.cut_move') }}</button>

        <div v-if="conditionalMovesEditorState.conditionalMovesDirty.unplayedLines.length > 0" class="conditional-move-tree-container">
            <h4>{{ $t('conditional_moves.inactive_lines') }}</h4>

            <button
                @click="conditionalMovesEditor.deleteAllInactives()"
                class="btn btn-sm btn-outline-danger ms-2"
            ><IconTrash /> {{ $t('conditional_moves.clear_inactive_lines') }}</button>

            <AppConditionalMoveTree
                theme="inactive"
                :tree="conditionalMovesEditorState.conditionalMovesDirty.unplayedLines"
                :playerIndex="conditionalMovesEditorState.myIndex"
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
