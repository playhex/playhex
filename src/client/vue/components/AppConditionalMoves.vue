<script setup lang="ts">
import { BIconCheck, BIconScissors, BIconTrash } from 'bootstrap-icons-vue';
import AppConditionalMoveTree from './AppConditionalMoveTree.vue';
import AppConditionalMoveButton from './AppConditionalMoveButton.vue';
import ConditionalMovesEditor from '../../../shared/app/ConditionalMovesEditor.js';

defineProps({
    conditionalMovesEditor: {
        type: ConditionalMovesEditor,
        required: true,
    },
});
</script>

<template>
    <div v-if="conditionalMovesEditor.getConditionalMovesDirty().tree.length > 0" class="conditional-move-tree-container">
        <AppConditionalMoveTree
            :tree="conditionalMovesEditor.getConditionalMovesDirty().tree"
            :selectedLine="conditionalMovesEditor.getSelectedLine()"
            :playerIndex="conditionalMovesEditor.getMyIndex()"
            @lineClicked="lineClicked => conditionalMovesEditor.setSelectedLine(lineClicked)"
        />
    </div>

    <AppConditionalMoveButton
        label="+"
        :playerIndex="conditionalMovesEditor.getOpponentIndex()"
        @click="conditionalMovesEditor.startNewLine()"
        aria-label="Add new conditional move"
    />

    <button
        v-if="conditionalMovesEditor.getIsSimulationMode()"
        @click="conditionalMovesEditor.submitConditionalMoves()"
        class="btn me-2"
        :class="conditionalMovesEditor.getHasChanges() ? 'btn-success' : 'btn-outline-success'"
    ><BIconCheck /> {{ $t('save') }}</button>

    <button
        v-if="conditionalMovesEditor.getIsSimulationMode()"
        @click="conditionalMovesEditor.discardSimulationMoves(); conditionalMovesEditor.disableSimulationMode()"
        class="btn"
        :class="conditionalMovesEditor.getHasChanges() ? 'btn-warning' : 'btn-outline-warning'"
    >{{ conditionalMovesEditor.getHasChanges() ? $t('discard') : $t('close') }}</button>

    <button
        v-if="conditionalMovesEditor.getSelectedLine().length > 0"
        @click="conditionalMovesEditor.cutMove()"
        class="btn btn-sm btn-outline-danger ms-2"
    ><BIconScissors /> {{ $t('conditional_moves.cut_move') }}</button>

    <div v-if="conditionalMovesEditor.getConditionalMovesDirty().unplayedLines.length > 0" class="conditional-move-tree-container">
        <h4>{{ $t('conditional_moves.inactive_lines') }}</h4>

        <button
            @click="conditionalMovesEditor.deleteAllInactives()"
            class="btn btn-sm btn-outline-danger ms-2"
        ><BIconTrash /> {{ $t('conditional_moves.clear_inactive_lines') }}</button>

        <AppConditionalMoveTree
            theme="inactive"
            :tree="conditionalMovesEditor.getConditionalMovesDirty().unplayedLines"
            :playerIndex="conditionalMovesEditor.getMyIndex()"
            @lineClicked="lineClicked => conditionalMovesEditor.setSelectedLine(lineClicked)"
        />
    </div>
</template>

<style lang="stylus" scoped>
.conditional-move-tree-container
    overflow-x auto
    overflow-y hidden
    white-space nowrap
    padding-bottom 0.5em
</style>
