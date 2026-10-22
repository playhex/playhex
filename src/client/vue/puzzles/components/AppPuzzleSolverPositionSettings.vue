<script setup lang="ts">
import type { Move } from '@playhex/move-notation';
import type { PositionTool } from '../composables/usePuzzleEditor.js';
import AppPuzzleEdgeConnectionTool from './AppPuzzleEdgeConnectionTool.vue';
import { IconEye, IconHexagonFill } from '../../icons.js';

/*
 * Position sent to Mohex: stones connected to an edge, and fill of disabled cells.
 * Shown before running Mohex, in engines and generate panels.
 */

defineProps<{
    positionTool: PositionTool;

    /**
     * Last clicked stone that cannot reach any edge.
     */
    edgeToolError: null | Move;

    /**
     * Connected stones whose path would change the puzzle.
     */
    impossibleEdgeConnections: Move[];

    hasDisabledCells: boolean;
    solverFillPreview: boolean;
}>();

defineEmits<{
    selectTool: [tool: PositionTool];
    toggleSolverFillPreview: [];
}>();
</script>

<template>
    <h2 class="h4 mb-2">{{ $t('puzzles.editor.solver_position') }}</h2>
    <p class="form-text mt-0 mb-3">{{ $t('puzzles.editor.solver_position_help') }}</p>

    <div class="mb-3">
        <AppPuzzleEdgeConnectionTool
            :selected="'edge' === positionTool"
            :error="edgeToolError"
            :impossibleConnections="impossibleEdgeConnections"
            @select="$emit('selectTool', 'edge')"
        />
    </div>

    <div v-if="hasDisabledCells" class="mb-3">
        <div class="form-label">{{ $t('puzzles.editor.solver_fill') }}</div>
        <div class="d-flex flex-wrap gap-2">
            <button
                class="btn"
                :class="solverFillPreview ? 'btn-info' : 'btn-outline-info'"
                :aria-pressed="solverFillPreview"
                @click="$emit('toggleSolverFillPreview')"
            ><IconEye /> {{ $t('puzzles.editor.solver_fill_preview') }}</button>
            <div class="btn-group">
                <button class="btn" :class="'fill_red' === positionTool ? 'btn-danger' : 'btn-outline-danger'" @click="$emit('selectTool', 'fill_red')"><IconHexagonFill /> {{ $t('puzzles.editor.solver_fill_red') }}</button>
                <button class="btn" :class="'fill_blue' === positionTool ? 'btn-primary' : 'btn-outline-primary'" @click="$emit('selectTool', 'fill_blue')"><IconHexagonFill /> {{ $t('puzzles.editor.solver_fill_blue') }}</button>
            </div>
        </div>
        <div class="form-text">{{ $t('puzzles.editor.solver_fill_help') }}</div>
    </div>
</template>
